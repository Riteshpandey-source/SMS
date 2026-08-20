const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// GET /api/super-admin/dashboard - Get platform-wide metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalFaculty = await User.countDocuments({ role: 'faculty' });

    // Recent signups
    const recentTenants = await Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name code subdomain plan status createdAt');

    res.json({
      success: true,
      data: {
        metrics: {
          totalTenants,
          activeTenants,
          totalUsers,
          totalStudents,
          totalFaculty
        },
        recentTenants
      }
    });
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to fetch dashboard metrics'
      }
    });
  }
};

// GET /api/super-admin/tenants - List all tenants
const getAllTenants = async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (plan) query.plan = plan;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } }
      ];
    }

    const tenants = await Tenant.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { tenants }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch tenants' }
    });
  }
};

// GET /api/super-admin/tenants/:id - Get specific tenant
const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' }
      });
    }

    const subscription = await Subscription.findOne({ tenantId: tenant.tenantId });
    const userCount = await User.countDocuments({ tenantId: tenant.tenantId });

    res.json({
      success: true,
      data: { tenant, subscription, stats: { userCount } }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch tenant details' }
    });
  }
};

// PATCH /api/super-admin/tenants/:id/status - Update tenant status
const updateTenantStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid status value' }
      });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        isActive: status === 'active'
      },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' }
      });
    }

    res.json({
      success: true,
      message: `Tenant status updated to ${status}`,
      data: { tenant }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update tenant status' }
    });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' }
      });
    }

    // Delete associated users (optional, but good for cleanup)
    const User = require('../models/User');
    await User.deleteMany({ tenantId: tenant.tenantId });

    // Delete the tenant
    await Tenant.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tenant and its associated users deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Failed to delete tenant' }
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getAllTenants,
  getTenantById,
  updateTenantStatus,
  deleteTenant
};
