require('dotenv').config();
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');

const routes = require('./routes');
const { connect: connectRabbitMQ } = require('./config/rabbitmq');
const { redis } = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow clients (including Postman) to override HTTP methods via
// query param (`_method`), request header `X-HTTP-Method-Override`,
// or body field when using forms. This helps tests that send GET
// requests but expect PUT semantics.
app.use(methodOverride('_method'));
app.use(methodOverride('X-HTTP-Method-Override'));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/', routes);

app.use((req, res) => {
  res.status(404).json({ status: 'failed', message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'failed', message: 'Internal server error' });
});

async function start() {
  try {
    await redis.connect();
  } catch (err) {
    console.warn('Redis not available, caching disabled:', err.message);
  }

  try {
    await connectRabbitMQ();
  } catch (err) {
    console.warn('RabbitMQ not available, message queue disabled:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`OpenJob API V2 running on http://localhost:${PORT}`);
  });
}

start();

module.exports = app;
