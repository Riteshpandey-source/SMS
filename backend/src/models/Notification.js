const mongoose = require('mongoose');

// Placeholder Notification model - will be implemented in task 8.1
// This file will contain the complete Notification schema with:
// - Notification content and type
// - Targeting rules (users, departments, years)
// - Read status tracking
// - Severity levels
// - Expiration handling

const notificationSchema = new mongoose.Schema({
  tenantId: { type: String, index: true, trim: true },
  // Schema will be implemented in task 8.1
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);