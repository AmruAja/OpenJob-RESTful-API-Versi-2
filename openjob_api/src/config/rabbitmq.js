require('dotenv').config();
const amqp = require('amqplib');

let connection = null;
let channel = null;

const QUEUE_NAME = 'application_notifications';

function getAmqpUrl() {
  const host = process.env.RABBITMQ_HOST || 'localhost';
  const port = process.env.RABBITMQ_PORT || 5672;
  const user = process.env.RABBITMQ_USER || 'guest';
  const password = process.env.RABBITMQ_PASSWORD || 'guest';

  if (process.env.AMQP_URL) {
    return process.env.AMQP_URL;
  }
  return `amqp://${user}:${password}@${host}:${port}`;
}

async function connect() {
  try {
    connection = await amqp.connect(getAmqpUrl());
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log('RabbitMQ connected successfully');

    connection.on('error', (err) => {
      console.warn('RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    return channel;
  } catch (err) {
    console.warn('RabbitMQ connection failed (notifications disabled):', err.message);
    connection = null;
    channel = null;
    return null;
  }
}

async function getChannel() {
  if (channel) return channel;
  return await connect();
}

async function publishMessage(payload) {
  try {
    const ch = await getChannel();
    if (!ch) return false;

    ch.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    return true;
  } catch (err) {
    console.warn('Failed to publish message:', err.message);
    return false;
  }
}

module.exports = { connect, getChannel, publishMessage, QUEUE_NAME, getAmqpUrl };
