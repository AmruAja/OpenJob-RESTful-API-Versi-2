const pool = require('../config/database');

async function getProfile(req, res) {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

function formatProfileApplication(row) {
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
    job_type: row.job_type,
    experience_level: row.experience_level,
  };
}

async function getProfileApplications(req, res) {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.job_id, a.status, a.created_at, a.updated_at,
              u.name as user_name, u.email as user_email,
              j.title as job_title, j.company_id, j.category_id,
              j.location_city, j.job_type, j.experience_level,
              c.name as company_name
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN jobs j ON a.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return res.status(200).json({
      status: 'success',
      data: { applications: result.rows.map(formatProfileApplication) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getProfileBookmarks(req, res) {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT b.*, j.title as job_title, c.name as company_name
       FROM bookmarks b
       LEFT JOIN jobs j ON b.job_id = j.id
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return res.status(200).json({ status: 'success', data: { bookmarks: result.rows } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { getProfile, getProfileApplications, getProfileBookmarks };
