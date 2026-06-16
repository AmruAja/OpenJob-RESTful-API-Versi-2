const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({
      status: 'failed',
      message: 'File is required and must be a PDF (max 5MB)',
    });
  }

  const userId = req.user.id;
  const id = uuidv4();
  const { filename, originalname, mimetype, size, path: filePath } = req.file;

  try {
    await pool.query(
      `INSERT INTO documents (id, user_id, filename, original_name, file_path, mime_type, file_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, userId, filename, originalname, filePath, mimetype, size]
    );
    return res.status(201).json({
      status: 'success',
      data: {
        documentId: id,
        filename: filename,
        originalName: originalname,
        size: size,
      },
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getAllDocuments(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM documents ORDER BY created_at DESC'
    );
    return res.status(200).json({ status: 'success', data: { documents: result.rows } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function getDocumentById(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Document not found' });
    }

    const doc = result.rows[0];
    if (!fs.existsSync(doc.file_path)) {
      return res.status(404).json({ status: 'failed', message: 'File not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
    return res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

async function deleteDocument(req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const existing = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: 'failed', message: 'Document not found' });
    }
    const doc = existing.rows[0];
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    fs.unlink(doc.file_path, () => {});
    return res.status(200).json({ status: 'success', message: 'Document deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'failed', message: 'Internal server error' });
  }
}

module.exports = { uploadDocument, getAllDocuments, getDocumentById, deleteDocument };
