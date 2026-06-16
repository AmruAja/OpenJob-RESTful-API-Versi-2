const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const jobSchema = Joi.object({
  company_id: Joi.string().required(),
  category_id: Joi.string().optional().allow('', null),
  title: Joi.string().required(),
  description: Joi.string().optional().allow('', null),
  job_type: Joi.string().optional().allow('', null),
  experience_level: Joi.string().optional().allow('', null),
  location_type: Joi.string().optional().allow('', null),
  location_city: Joi.string().optional().allow('', null),
  salary_min: Joi.number().optional().allow(null),
  salary_max: Joi.number().optional().allow(null),
  is_salary_visible: Joi.boolean().optional().default(true),
  status: Joi.string().valid('open', 'closed').optional().default('open'),
});

const updateJobSchema = jobSchema.fork(
  ['company_id', 'title'],
  (s) => s.optional()
).options({ stripUnknown: true });

function formatJob(row) {
  return {
    id: row.id,
    company_id: row.company_id,
    category_id: row.category_id,
    title: row.title,
    description: row.description,
    job_type: row.job_type,
    experience_level: row.experience_level,
    location_type: row.location_type,
    location_city: row.location_city,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    is_salary_visible: row.is_salary_visible,
    company_name: row.company_name,
  };
}

const JOB_QUERY = `
  SELECT j.id, j.company_id, j.category_id, j.title, j.description,
         j.job_type, j.experience_level, j.location_type, j.location_city,
         j.salary_min, j.salary_max, j.is_salary_visible, j.status,
         c.name AS company_name
  FROM jobs j
  LEFT JOIN companies c ON j.company_id = c.id
`;

async function addJob(req, res) {
  const { error, value } = jobSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  const companyCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [value.company_id]);
  if (companyCheck.rows.length === 0) {
    return res.status(400).json({ status: 'failed', message: 'Company not found' });
  }

  const id = uuidv4();
  const {
    company_id, category_id, title, description, job_type, experience_level,
    location_type, location_city, salary_min, salary_max, is_salary_visible, status,
  } = value;

  try {
    await pool.query(
      `INSERT INTO jobs
        (id, company_id, category_id, title, description, job_type, experience_level,
         location_type, location_city, salary_min, salary_max, is_salary_visible, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, company_id, category_id || null, title, description || null,
        job_type || null, experience_level || null, location_type || null,
        location_city || null, salary_min ?? null, salary_max ?? null,
        is_salary_visible ?? true, status || 'open']
    );
    const result = await pool.query(JOB_QUERY + ' WHERE j.id = $1', [id]);
    return res.status(201).json({ status: 'success', data: formatJob(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getAllJobs(req, res) {
  const { title, 'company-name': companyName } = req.query;
  try {
    let query = JOB_QUERY + ' WHERE 1=1';
    const params = [];

    if (title && title.trim()) {
      params.push(`%${title.trim()}%`);
      query += ` AND j.title ILIKE $${params.length}`;
    }
    if (companyName && companyName.trim()) {
      params.push(`%${companyName.trim()}%`);
      query += ` AND c.name ILIKE $${params.length}`;
    }
    query += ' ORDER BY j.created_at DESC';

    const result = await pool.query(query, params);
    return res.status(200).json({ status: 'success', data: { jobs: result.rows.map(formatJob) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getJobById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(JOB_QUERY + ' WHERE j.id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Job not found' });
    }
    return res.status(200).json({ status: 'success', data: formatJob(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getJobsByCompanyId(req, res) {
  const { companyId } = req.params;
  try {
    const result = await pool.query(JOB_QUERY + ' WHERE j.company_id = $1 ORDER BY j.created_at DESC', [companyId]);
    return res.status(200).json({ status: 'success', data: { jobs: result.rows.map(formatJob) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getJobsByCategoryId(req, res) {
  const { categoryId } = req.params;
  try {
    const result = await pool.query(JOB_QUERY + ' WHERE j.category_id = $1 ORDER BY j.created_at DESC', [categoryId]);
    return res.status(200).json({ status: 'success', data: { jobs: result.rows.map(formatJob) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function updateJob(req, res) {
  const { id } = req.params;
  const { error, value } = updateJobSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }
  try {
    const existing = await pool.query('SELECT id FROM jobs WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Job not found' });
    }
    const {
      company_id, category_id, title, description, job_type, experience_level,
      location_type, location_city, salary_min, salary_max, is_salary_visible, status,
    } = value;

    await pool.query(
      `UPDATE jobs SET
        company_id = COALESCE($1, company_id),
        category_id = COALESCE($2, category_id),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        job_type = COALESCE($5, job_type),
        experience_level = COALESCE($6, experience_level),
        location_type = COALESCE($7, location_type),
        location_city = COALESCE($8, location_city),
        salary_min = COALESCE($9, salary_min),
        salary_max = COALESCE($10, salary_max),
        is_salary_visible = COALESCE($11, is_salary_visible),
        status = COALESCE($12, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $13`,
      [
        company_id || null, category_id || null, title || null, description || null,
        job_type || null, experience_level || null, location_type || null,
        location_city || null, salary_min ?? null, salary_max ?? null,
        is_salary_visible ?? null, status || null, id,
      ]
    );
    return res.status(200).json({ status: 'success', message: 'Job updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function deleteJob(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Job not found' });
    }
    return res.status(200).json({ status: 'success', message: 'Job deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = {
  addJob, getAllJobs, getJobById, getJobsByCompanyId,
  getJobsByCategoryId, updateJob, deleteJob,
};
