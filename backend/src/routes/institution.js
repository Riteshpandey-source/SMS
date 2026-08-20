const express = require('express');
const router = express.Router();
const institutionController = require('../controllers/institutionController');
const { authenticate, institutionAdminOrAbove } = require('../middleware/auth');

// All routes require institution_admin or super_admin role
router.use(authenticate, institutionAdminOrAbove);

// GET /api/institution/profile
router.get('/profile', institutionController.getInstitutionProfile);

// PUT /api/institution/profile
router.put('/profile', institutionController.updateInstitutionProfile);

// GET /api/institution/stats
router.get('/stats', institutionController.getInstitutionStats);

module.exports = router;
