const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { authenticate, superAdminOnly } = require('../middleware/auth');

// All routes require super_admin role
router.use(authenticate, superAdminOnly);

// GET /api/super-admin/dashboard
router.get('/dashboard', superAdminController.getDashboardMetrics);

// GET /api/super-admin/tenants
router.get('/tenants', superAdminController.getAllTenants);

// GET /api/super-admin/tenants/:id
router.get('/tenants/:id', superAdminController.getTenantById);

// PATCH /api/super-admin/tenants/:id/status
router.patch('/tenants/:id/status', superAdminController.updateTenantStatus);

// DELETE /api/super-admin/tenants/:id
router.delete('/tenants/:id', superAdminController.deleteTenant);

module.exports = router;
