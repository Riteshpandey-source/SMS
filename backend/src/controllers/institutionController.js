const Tenant = require('../models/Tenant');
const User = require('../models/User');

// GET /api/institution/profile - Get current institution details
const getInstitutionProfile = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Institution not found' }
      });
    }

    res.json({
      success: true,
      data: { tenant }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch institution profile' }
    });
  }
};

// PUT /api/institution/profile - Update institution details
const updateInstitutionProfile = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const updates = req.body;

    // Prevent updating critical fields
    delete updates.tenantId;
    delete updates.plan;
    delete updates.subscriptionStatus;
    delete updates.status;

    const tenant = await Tenant.findOneAndUpdate(
      { tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Institution not found' }
      });
    }

    res.json({
      success: true,
      message: 'Institution profile updated successfully',
      data: { tenant }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update institution profile' }
    });
  }
};

// GET /api/institution/stats - Get institution stats
const getInstitutionStats = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const totalStudents = await User.countDocuments({ role: 'student', tenantId });
    const totalFaculty = await User.countDocuments({ role: 'faculty', tenantId });
    
    // Assuming Attendance model is scoped automatically
    // For now we just return basic user counts
    
    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalFaculty
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch institution stats' }
    });
  }
};

module.exports = {
  getInstitutionProfile,
  updateInstitutionProfile,
  getInstitutionStats
};
