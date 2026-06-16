const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { getCache, setCache, deleteCache } = require('../config/redis');
const { publishMessage } = require('../config/rabbitmq');

const applicationSchema = Joi.object({
  user_id: Joi.string().required(),
  job_id: Joi.string().required(),
  status: Joi.string().valid('pending', 'reviewed', 'accepted', 'rejected').default('pending'),
});

const updateSchema = Joi.object({
  status: Joi.string().valid('pending', 'reviewed', 'accepted', 'rejected').required(),
});

function formatApplicationFull(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_name: row.user_name,
    user_email: row.user_email,
    job_title: row.job_title,
    company_name: row.company_name,
    company_id: row.company_id,
    category_id: row.category_id,
    location_city: row.location_city,
  };
}

function formatApplicationDetail(row) {
  return formatApplicationFull(row);
}

const APP_FULL_QUERY = `
  SELECT a.id, a.user_id, a.job_id, a.status, a.created_at, a.updated_at,
         u.name as user_name, u.email as user_email,
         j.title as job_title, j.company_id, j.category_id, j.location_city,
         c.name as company_name
  FROM applications a
  LEFT JOIN users u ON a.user_id = u.id
  LEFT JOIN jobs j ON a.job_id = j.id
  LEFT JOIN companies c ON j.company_id = c.id
`;

async function applyForJob(req, res) {
  const { error, value } = applicationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  const { user_id, job_id, status } = value;
  const id = uuidv4();

  try {
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [job_id]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Job not found' });
    }

    const result = await pool.query(
      'INSERT INTO applications (id, user_id, job_id, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, user_id, job_id, status]
    );

    const application = result.rows[0];

    publishMessage({ application_id: application.id }).catch(() => {});

    await deleteCache(`applications:user:${user_id}`);
    await deleteCache(`applications:job:${job_id}`);

    return res.status(201).json({ status: 'success', data: application });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ status: 'failed', message: 'You have already applied for this job' });
    }
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getAllApplications(req, res) {
  try {
    const result = await pool.query(APP_FULL_QUERY + ' ORDER BY a.created_at DESC');
    return res.status(200).json({
      status: 'success',
      data: { applications: result.rows.map(formatApplicationFull) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getApplicationById(req, res) {
  const { id } = req.params;
  const cacheKey = `application:${id}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).set('X-Data-Source', 'cache').json({ status: 'success', data: cached });
  }

  try {
    const result = await pool.query(APP_FULL_QUERY + ' WHERE a.id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Application not found' });
    }
    const application = formatApplicationDetail(result.rows[0]);
    await setCache(cacheKey, application);
    return res.status(200).set('X-Data-Source', 'database').json({ status: 'success', data: application });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getApplicationsByUserId(req, res) {
  const { userId } = req.params;
  const cacheKey = `applications:user:${userId}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).set('X-Data-Source', 'cache').json({ status: 'success', data: cached });
  }

  try {
    const result = await pool.query(APP_FULL_QUERY + ' WHERE a.user_id = $1 ORDER BY a.created_at DESC', [userId]);
    const data = { applications: result.rows.map(formatApplicationFull) };
    await setCache(cacheKey, data);
    return res.status(200).set('X-Data-Source', 'database').json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getApplicationsByJobId(req, res) {
  const { jobId } = req.params;
  const cacheKey = `applications:job:${jobId}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).set('X-Data-Source', 'cache').json({ status: 'success', data: cached });
  }

  try {
    const result = await pool.query(APP_FULL_QUERY + ' WHERE a.job_id = $1 ORDER BY a.created_at DESC', [jobId]);
    const data = { applications: result.rows.map(formatApplicationFull) };
    await setCache(cacheKey, data);
    return res.status(200).set('X-Data-Source', 'database').json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function updateApplication(req, res) {
  const { id } = req.params;
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'failed', message: error.details[0].message });
  }

  try {
    const existing = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Application not found' });
    }

    const app = existing.rows[0];
    await pool.query(
      'UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [value.status, id]
    );

    await deleteCache(`application:${id}`);
    await deleteCache(`applications:user:${app.user_id}`);
    await deleteCache(`applications:job:${app.job_id}`);

    return res.status(200).json({ status: 'success', message: 'Application updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function deleteApplication(req, res) {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Application not found' });
    }

    const app = existing.rows[0];
    await pool.query('DELETE FROM applications WHERE id = $1', [id]);

    await deleteCache(`application:${id}`);
    await deleteCache(`applications:user:${app.user_id}`);
    await deleteCache(`applications:job:${app.job_id}`);

    return res.status(200).json({ status: 'success', message: 'Application deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = {
  applyForJob, getAllApplications, getApplicationById,
  getApplicationsByUserId, getApplicationsByJobId,
  updateApplication, deleteApplication,
};
