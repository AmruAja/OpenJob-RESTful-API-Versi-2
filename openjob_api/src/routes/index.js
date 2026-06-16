const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const usersHandler = require('../handlers/users');
const authHandler = require('../handlers/authentications');
const companiesHandler = require('../handlers/companies');
const categoriesHandler = require('../handlers/categories');
const jobsHandler = require('../handlers/jobs');
const applicationsHandler = require('../handlers/applications');
const bookmarksHandler = require('../handlers/bookmarks');
const documentsHandler = require('../handlers/documents');
const profileHandler = require('../handlers/profile');

// ── Users ──────────────────────────────────────────────
router.post('/users', usersHandler.addUser);
router.get('/users/:id', usersHandler.getUserById);
router.put('/users/:id', authenticate, usersHandler.updateUser);

// ── Authentications ────────────────────────────────────
router.post('/authentications', authHandler.login);
router.put('/authentications', authHandler.refresh);
router.delete('/authentications', authHandler.logout);

// ── Companies ──────────────────────────────────────────
router.post('/companies', authenticate, companiesHandler.addCompany);
router.get('/companies', companiesHandler.getAllCompanies);
router.get('/companies/:id', companiesHandler.getCompanyById);
router.put('/companies/:id', authenticate, companiesHandler.updateCompany);
router.delete('/companies/:id', authenticate, companiesHandler.deleteCompany);

// ── Categories ─────────────────────────────────────────
router.post('/categories', authenticate, categoriesHandler.addCategory);
router.get('/categories', categoriesHandler.getAllCategories);
router.get('/categories/:id', categoriesHandler.getCategoryById);
router.put('/categories/:id', authenticate, categoriesHandler.updateCategory);
router.delete('/categories/:id', authenticate, categoriesHandler.deleteCategory);

// ── Jobs ───────────────────────────────────────────────
router.post('/jobs', authenticate, jobsHandler.addJob);
router.get('/jobs', jobsHandler.getAllJobs);
router.get('/jobs/company/:companyId', jobsHandler.getJobsByCompanyId);
router.get('/jobs/category/:categoryId', jobsHandler.getJobsByCategoryId);
router.get('/jobs/:id', jobsHandler.getJobById);
router.put('/jobs/:id', authenticate, jobsHandler.updateJob);
router.delete('/jobs/:id', authenticate, jobsHandler.deleteJob);

// ── Bookmarks (nested under /jobs/:jobId) ─────────────
router.post('/jobs/:jobId/bookmark', authenticate, bookmarksHandler.addBookmark);
router.delete('/jobs/:jobId/bookmark', authenticate, bookmarksHandler.deleteBookmark);
router.get('/jobs/:jobId/bookmark/:id', authenticate, bookmarksHandler.getBookmarkById);

// ── Applications ───────────────────────────────────────
// Specific routes BEFORE /:id to prevent routing conflicts
router.post('/applications', authenticate, applicationsHandler.applyForJob);
router.get('/applications', authenticate, applicationsHandler.getAllApplications);
router.get('/applications/user/:userId', authenticate, applicationsHandler.getApplicationsByUserId);
router.get('/applications/job/:jobId', authenticate, applicationsHandler.getApplicationsByJobId);
router.get('/applications/:id', authenticate, applicationsHandler.getApplicationById);
router.put('/applications/:id', authenticate, applicationsHandler.updateApplication);
router.delete('/applications/:id', authenticate, applicationsHandler.deleteApplication);

// ── Bookmarks (user list) ──────────────────────────────
router.get('/bookmarks', authenticate, bookmarksHandler.getAllUserBookmarks);

// ── Documents ─────────────────────────────────────────
// POST requires auth; GET routes do NOT require auth (per Postman test collection)
router.post('/documents', authenticate, (req, res, next) => {
  const uploadSingle = upload.single('document');
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'failed',
          message: 'File is required and must be a PDF (max 5MB). File size exceeds 5MB limit.',
        });
      }
      return res.status(400).json({
        status: 'failed',
        message: `File is required and must be a PDF (max 5MB). ${err.message}`,
      });
    }
    next();
  });
}, documentsHandler.uploadDocument);

router.get('/documents', documentsHandler.getAllDocuments);         // NO auth required
router.get('/documents/:id', documentsHandler.getDocumentById);    // NO auth required
router.delete('/documents/:id', authenticate, documentsHandler.deleteDocument);

// ── Profile ────────────────────────────────────────────
router.get('/profile', authenticate, profileHandler.getProfile);
router.get('/profile/applications', authenticate, profileHandler.getProfileApplications);
router.get('/profile/bookmarks', authenticate, profileHandler.getProfileBookmarks);

module.exports = router;
