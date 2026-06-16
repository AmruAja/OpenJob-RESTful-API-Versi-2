const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { getCache, setCache, deleteCache } = require('../config/redis');

const BOOKMARK_QUERY = `
  SELECT
    b.id, b.user_id, b.job_id, b.created_at,
    j.title          AS job_title,
    j.description    AS job_description,
    j.job_type,
    j.experience_level,
    j.location_type,
    j.location_city,
    j.salary_min,
    j.salary_max,
    j.is_salary_visible,
    j.company_id,
    j.category_id,
    c.name           AS company_name,
    cat.name         AS category_name,
    j.created_at     AS job_created_at
  FROM bookmarks b
  LEFT JOIN jobs j      ON b.job_id      = j.id
  LEFT JOIN companies c ON j.company_id  = c.id
  LEFT JOIN categories cat ON j.category_id = cat.id
`;

function formatBookmark(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    created_at: row.created_at,
    job_title: row.job_title,
    job_description: row.job_description,
    job_type: row.job_type,
    experience_level: row.experience_level,
    location_type: row.location_type,
    location_city: row.location_city,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    is_salary_visible: row.is_salary_visible,
    company_id: row.company_id,
    category_id: row.category_id,
    company_name: row.company_name,
    category_name: row.category_name,
    job_created_at: row.job_created_at,
  };
}

async function addBookmark(req, res) {
  const { jobId } = req.params;
  const userId = req.user.id;
  try {
    const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Job not found' });
    }
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO bookmarks (id, user_id, job_id) VALUES ($1,$2,$3) RETURNING *',
      [id, userId, jobId]
    );
    await deleteCache(`bookmarks:user:${userId}`);
    return res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ status: 'failed', message: 'Job already bookmarked' });
    }
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getAllUserBookmarks(req, res) {
  const userId = req.user.id;
  const cacheKey = `bookmarks:user:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).set('X-Data-Source', 'cache').json({ status: 'success', data: cached });
  }
  try {
    const result = await pool.query(
      BOOKMARK_QUERY + ' WHERE b.user_id = $1 ORDER BY b.created_at DESC',
      [userId]
    );
    const data = { bookmarks: result.rows.map(formatBookmark) };
    await setCache(cacheKey, data);
    return res.status(200).set('X-Data-Source', 'database').json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getBookmarkById(req, res) {
  const { jobId, id } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      BOOKMARK_QUERY + ' WHERE b.id = $1 AND b.user_id = $2 AND b.job_id = $3',
      [id, userId, jobId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Bookmark not found' });
    }
    return res.status(200).json({ status: 'success', data: formatBookmark(result.rows[0]) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function deleteBookmark(req, res) {
  const { jobId } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'DELETE FROM bookmarks WHERE job_id = $1 AND user_id = $2 RETURNING id',
      [jobId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Bookmark not found' });
    }
    await deleteCache(`bookmarks:user:${userId}`);
    return res.status(200).json({ status: 'success', message: 'Bookmark deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { addBookmark, getAllUserBookmarks, getBookmarkById, deleteBookmark };
