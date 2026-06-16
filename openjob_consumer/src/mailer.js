require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

/**
 * Kirim email notifikasi ke pemilik job (owner perusahaan).
 *
 * @param {object} options
 * @param {string} options.to - Email tujuan (pemilik job)
 * @param {string} options.ownerName - Nama pemilik job
 * @param {string} options.jobTitle - Judul lowongan
 * @param {string} options.applicantName - Nama pelamar
 * @param {string} options.applicantEmail - Email pelamar
 * @param {string|Date} options.applicationDate - Tanggal lamaran
 */
async function sendApplicationNotification({ to, ownerName, jobTitle, applicantName, applicantEmail, applicationDate }) {
  const formattedDate = new Date(applicationDate).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });

  const mailOptions = {
    from: `"OpenJob Notification" <${process.env.MAIL_USER}>`,
    to,
    subject: `[OpenJob] Lamaran Baru untuk Posisi ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Notifikasi Lamaran Baru</h2>
        <p>Halo <strong>${ownerName}</strong>,</p>
        <p>Ada kandidat baru yang melamar untuk posisi <strong>${jobTitle}</strong> di perusahaan Anda.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; width: 40%;"><strong>Nama Pelamar</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${applicantName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Email Pelamar</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${applicantEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Tanggal Lamaran</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${formattedDate}</td>
          </tr>
        </table>
        <p>Silakan masuk ke platform OpenJob untuk meninjau lamaran ini.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Email ini dikirim secara otomatis oleh sistem OpenJob.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendApplicationNotification };
