const mongoose = require('mongoose');

// Placeholder Question model - will be implemented in task 7.1
// This file will contain the complete Question schema with:
// - Question content and metadata
// - Tags and categorization
// - Voting system
// - Academic context
// - Answer relationships

const questionSchema = new mongoose.Schema({
  tenantId: { type: String, index: true, trim: true },
  // Schema will be implemented in task 7.1
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);