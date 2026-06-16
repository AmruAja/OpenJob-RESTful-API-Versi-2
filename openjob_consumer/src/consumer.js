require('dotenv').config();
const amqp = require('amqplib');
const pool = require('./db');
const { sendApplicationNotification } = require('./mailer');

const QUEUE_NAME = 'application_notifications';
const RECONNECT_DELAY_MS = 5000;

function getAmqpUrl() {
  if (process.env.AMQP_URL) return process.env.AMQP_URL;

  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || 5672;
  const user = process.env.RABBITMQ_USER || 'guest';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';

  return `amqp://${user}:${password}@${host}:${port}`;
}

/**
 * Query database untuk mendapatkan detail aplikasi beserta
 * info pelamar dan pemilik job, lalu kirim email notifikasi.
 *
 * @param {string} applicationId
 */
async function processApplicationMessage(applicationId) {
  // Ambil data aplikasi: pelamar + info job + perusahaan
  const appResult = await pool.query(
    `SELECT
        a.id            AS application_id,
        a.created_at    AS application_date,
        u.name          AS applicant_name,
        u.email         AS applicant_email,
        j.title         AS job_title,
        j.company_id
     FROM applications a
     JOIN users u ON a.user_id = u.id
     JOIN jobs   j ON a.job_id  = j.id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (appResult.rows.length === 0) {
    console.error(`[Consumer] Application not found: ${applicationId}`);
    return;
  }

  const app = appResult.rows[0];

  // Cari pemilik job — user yang membuat perusahaan (company owner).
  // Karena tabel companies tidak menyimpan owner_id secara eksplisit,
  // kita cari user yang role-nya bukan 'user' biasa (admin/owner) dan
  // bukan si pelamar itu sendiri.
  // Pendekatan: cari user pertama yang bukan pelamar di tabel users.
  // Untuk production, sebaiknya tambahkan kolom owner_id di companies.
  const ownerResult = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     WHERE u.id != (
       SELECT user_id FROM applications WHERE id = $1
     )
     ORDER BY u.created_at ASC
     LIMIT 1`,
    [applicationId]
  );

  if (ownerResult.rows.length === 0) {
    console.warn(`[Consumer] No owner found to notify for application: ${applicationId}`);
    return;
  }

  const owner = ownerResult.rows[0];

  console.log(`[Consumer] Sending email notification to ${owner.email} for application ${applicationId}`);

  await sendApplicationNotification({
    to: owner.email,
    ownerName: owner.name,
    jobTitle: app.job_title,
    applicantName: app.applicant_name,
    applicantEmail: app.applicant_email,
    applicationDate: app.application_date,
  });

  console.log(`[Consumer] Email sent successfully to ${owner.email}`);
}

async function startConsumer() {
  let connection;
  let channel;

  try {
    console.log('[Consumer] Connecting to RabbitMQ...');
    connection = await amqp.connect(getAmqpUrl());
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1); // proses satu pesan dalam satu waktu

    console.log(`[Consumer] Listening on queue: "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      let payload;
      try {
        payload = JSON.parse(msg.content.toString());
      } catch {
        console.error('[Consumer] Failed to parse message payload');
        channel.ack(msg); // buang pesan rusak
        return;
      }

      const { application_id } = payload;

      if (!application_id) {
        console.error('[Consumer] Missing application_id in payload:', payload);
        channel.ack(msg);
        return;
      }

      console.log(`[Consumer] Processing application: ${application_id}`);

      try {
        await processApplicationMessage(application_id);
        channel.ack(msg);
        console.log(`[Consumer] Done processing: ${application_id}`);
      } catch (err) {
        console.error(`[Consumer] Error processing ${application_id}:`, err.message);
        // nack tanpa requeue agar tidak loop error terus-menerus
        channel.nack(msg, false, false);
      }
    });

    // Handle koneksi terputus
    connection.on('close', () => {
      console.warn('[Consumer] RabbitMQ connection closed. Reconnecting...');
      setTimeout(startConsumer, RECONNECT_DELAY_MS);
    });

    connection.on('error', (err) => {
      console.error('[Consumer] RabbitMQ connection error:', err.message);
    });
  } catch (err) {
    console.error('[Consumer] Failed to connect:', err.message);
    console.log(`[Consumer] Retrying in ${RECONNECT_DELAY_MS / 1000}s...`);
    setTimeout(startConsumer, RECONNECT_DELAY_MS);
  }
}

startConsumer();
