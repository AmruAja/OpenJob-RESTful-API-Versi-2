require('dotenv').config();
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'failed',
      message: 'Missing or invalid authorization token',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'access_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'failed',
      message: 'Invalid or expired token',
    });
  }
}

module.exports = { authenticate };
