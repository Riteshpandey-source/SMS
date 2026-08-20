// User interface
export const UserType = {
  id: '',
  name: '',
  email: '',
  avatar: '',
  year: '',
  branch: '',
  reputation: 0,
  department: '',
  academicYear: 0
};

// Event interface
export const EventType = {
  id: '',
  title: '',
  description: '',
  date: '',
  time: '',
  location: '',
  category: '', // 'academic' | 'cultural' | 'sports' | 'technical' | 'other'
  organizer: '',
  attendees: 0,
  targetYears: [], // [1, 2, 3, 4] - which years this event is for
  targetDepartments: [], // ['CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL'] - which departments
  isOpenToAll: false // if true, open to all years/departments
};

// Note interface
export const NoteType = {
  id: '',
  title: '',
  subject: '',
  description: '',
  fileName: '',
  fileSize: '',
  uploadedBy: '',
  uploadDate: '',
  downloads: 0,
  tags: [],
  semester: '',
  academicYear: 0, // 1, 2, 3, 4
  department: '', // 'CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', etc.
  courseCode: '' // e.g., 'CS301', 'ECE205'
};

// Question interface
export const QuestionType = {
  id: '',
  title: '',
  content: '',
  tags: [],
  author: '',
  authorAvatar: '',
  createdAt: '',
  votes: 0,
  answers: [],
  views: 0,
  solved: false,
  academicYear: 0, // optional - if question is year-specific
  department: '', // optional - if question is department-specific
  subject: '' // subject/course related to question
};

// Answer interface
export const AnswerType = {
  id: '',
  content: '',
  author: '',
  authorAvatar: '',
  createdAt: '',
  votes: 0,
  accepted: false
};

// Notification interface
export const NotificationType = {
  id: '',
  type: '', // 'event' | 'note' | 'forum' | 'system'
  title: '',
  message: '',
  timestamp: '',
  read: false,
  actionUrl: '',
  targetYears: [], // which years should see this notification
  targetDepartments: [], // which departments should see this
  isGlobal: false // if true, visible to all students
};

// Subject interface
export const SubjectType = {
  id: '',
  name: '',
  code: '',
  credits: 0,
  faculty: '',
  semester: ''
};

// AttendanceRecord interface
export const AttendanceRecordType = {
  id: '',
  subjectId: '',
  subjectName: '',
  subjectCode: '',
  totalClasses: 0,
  attendedClasses: 0,
  percentage: 0,
  requiredPercentage: 0,
  isDebarred: false,
  lastUpdated: ''
};

// MidTermMark interface
export const MidTermMarkType = {
  id: '',
  subjectId: '',
  subjectName: '',
  subjectCode: '',
  maxMarks: 0,
  obtainedMarks: 0,
  percentage: 0,
  grade: '',
  examDate: '',
  remarks: ''
};

// AcademicRecord interface
export const AcademicRecordType = {
  studentId: '',
  semester: '',
  cgpa: 0,
  sgpa: 0,
  totalCredits: 0,
  attendance: [],
  midTermMarks: [],
  overallAttendance: 0,
  isDebarred: false,
  debarredSubjects: []
};

// ParentNotification interface
export const ParentNotificationType = {
  studentId: '',
  studentName: '',
  notificationType: '', // 'attendance' | 'marks' | 'debarment' | 'academic'
  severity: '' // 'low' | 'medium' | 'high' | 'critical'
};