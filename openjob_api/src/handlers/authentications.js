require('dotenv').config();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}

async function login(req, res) {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  const { email, password } = value;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'failed', message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ status: 'failed', message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const authId = uuidv4();
    await pool.query(
      'INSERT INTO authentications (id, user_id, refresh_token) VALUES ($1, $2, $3)',
      [authId, user.id, refreshToken]
    );

    return res.status(200).json({
      status: 'success',
      data: { accessToken, refreshToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function refresh(req, res) {
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  const { refreshToken } = value;

  try {
    const authResult = await pool.query(
      'SELECT * FROM authentications WHERE refresh_token = $1',
      [refreshToken]
    );
    if (authResult.rows.length === 0) {
      return res.status(400).json({ status: 'failed', message: 'Refresh token not found' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(400).json({ status: 'failed', message: 'Invalid refresh token' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ status: 'failed', message: 'User not found' });
    }

    const accessToken = generateAccessToken(userResult.rows[0]);

    return res.status(200).json({
      status: 'success',
      data: { accessToken },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function logout(req, res) {
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  const { refreshToken } = value;

  try {
    const result = await pool.query(
      'DELETE FROM authentications WHERE refresh_token = $1 RETURNING id',
      [refreshToken]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ status: 'failed', message: 'Refresh token not found' });
    }

    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { login, refresh, logout };
