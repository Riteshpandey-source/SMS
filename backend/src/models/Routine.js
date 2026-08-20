const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: [true, 'Tenant ID is required'],
      index: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    department: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    academicYear: {
      type: Number,
      min: 1,
      max: 4
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10
    },
    file: {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
      url: { type: String, required: true }
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

routineSchema.index({ department: 1, academicYear: 1, createdAt: -1 });

module.exports = mongoose.model('Routine', routineSchema);
