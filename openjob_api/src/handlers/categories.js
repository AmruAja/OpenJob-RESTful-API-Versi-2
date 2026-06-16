const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const categorySchema = Joi.object({
  name: Joi.string().min(1).required(),
});

function formatCategory(row) {
  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function addCategory(req, res) {
  const { error, value } = categorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }
  const id = uuidv4();
  try {
    const result = await pool.query(
      'INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING *',
      [id, value.name]
    );
    return res.status(201).json({ status: 'success', data: formatCategory(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getAllCategories(req, res) {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY created_at DESC');
    return res.status(200).json({
      status: 'success',
      data: { categories: result.rows.map(formatCategory) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getCategoryById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Category not found' });
    }
    return res.status(200).json({ status: 'success', data: formatCategory(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function updateCategory(req, res) {
  const { id } = req.params;
  const { error, value } = categorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }
  try {
    const result = await pool.query(
      'UPDATE categories SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [value.name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Category not found' });
    }
    return res.status(200).json({ status: 'success', message: 'Category updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function deleteCategory(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Category not found' });
    }
    return res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { addCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory };
