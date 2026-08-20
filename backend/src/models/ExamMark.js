const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true, trim: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  subjectName: { type: String, required: true, trim: true },
  department: { type: String, required: true, uppercase: true, trim: true, index: true },
  academicYear: { type: Number, required: true, min: 1, max: 4, index: true },
  assessmentType: { type: String, required: true, trim: true }, // e.g. Mid-1, Mid-2, Internal, Practical
  examDate: { type: Date, required: true, index: true },
  maxMarks: { type: Number, required: true, min: 1 },
  obtainedMarks: { type: Number, required: true, min: 0 },
  remarks: { type: String, trim: true, maxlength: 200 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

examMarkSchema.index(
  { studentId: 1, subjectCode: 1, assessmentType: 1, examDate: 1, facultyId: 1 },
  { unique: true, name: 'unique_exam_per_faculty_student' }
);

examMarkSchema.virtual('percentage').get(function() {
  if (!this.maxMarks) return 0;
  return Math.round((this.obtainedMarks / this.maxMarks) * 10000) / 100;
});

module.exports = mongoose.model('ExamMark', examMarkSchema);
