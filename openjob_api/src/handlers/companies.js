const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getCache, setCache, deleteCache } = require('../config/redis');

const companySchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.string().required(),
  description: Joi.string().required(),
  logo_url: Joi.string().optional().allow('', null),
  website: Joi.string().optional().allow('', null),
});

const updateSchema = Joi.object({
  name: Joi.string().optional(),
  location: Joi.string().optional().allow('', null),
  description: Joi.string().optional().allow('', null),
  logo_url: Joi.string().optional().allow('', null),
  website: Joi.string().optional().allow('', null),
});

function formatCompany(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    description: row.description,
    logo_url: row.logo_url,
    website: row.website,
  };
}

async function addCompany(req, res) {
  const { error, value } = companySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }
  const { name, location, description, logo_url, website } = value;
  const id = uuidv4();
  try {
    const result = await pool.query(
      'INSERT INTO companies (id,name,location,description,logo_url,website) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, name, location, description, logo_url || null, website || null]
    );
    return res.status(201).json({ status: 'success', data: formatCompany(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getAllCompanies(req, res) {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    return res.status(200).json({
      status: 'success',
      data: { companies: result.rows.map(formatCompany) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getCompanyById(req, res) {
  const { id } = req.params;
  const cacheKey = `company:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).set('X-Data-Source', 'cache').json({ status: 'success', data: cached });
  }
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Company not found' });
    }
    const company = formatCompany(result.rows[0]);
    await setCache(cacheKey, company);
    return res.status(200).set('X-Data-Source', 'database').json({ status: 'success', data: company });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function updateCompany(req, res) {
  const { id } = req.params;
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }
  try {
    const existing = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Company not found' });
    }
    const { name, location, description, logo_url, website } = value;
    const result = await pool.query(
      `UPDATE companies SET
        name = COALESCE($1, name), location = COALESCE($2, location),
        description = COALESCE($3, description), logo_url = COALESCE($4, logo_url),
        website = COALESCE($5, website), updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [name || null, location || null, description || null, logo_url || null, website || null, id]
    );
    await deleteCache(`company:${id}`);
    
    return res.status(200).json({ status: 'success', message: 'Company updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function deleteCompany(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Company not found' });
    }
    await deleteCache(`company:${id}`);
    return res.status(200).json({ status: 'success', message: 'Company deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { addCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany };
