const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getCache, setCache, deleteCache } = require('../config/redis');

const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

async function addUser(req, res) {
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  const { name, email, password, role } = value;
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (id,name,email,password,role) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role',
      [id, name, email, hashedPassword, role]
    );
    return res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ status: 'failed', message: 'Email already exists' });
    }
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;
  const cacheKey = `user:${id}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).set('X-Data-Source', 'cache').json({ status: 'success', data: cached });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }
    const user = result.rows[0];
    await setCache(cacheKey, user);
    return res.status(200).set('X-Data-Source', 'database').json({ status: 'success', data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, password, role } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        role = COALESCE($4, role),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING id, name, email, role`,
      [name || null, email || null, hashedPassword || null, role || null, id]
    );

    await deleteCache(`user:${id}`);

    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { addUser, getUserById, updateUser };
