import { Event, Note, Question, Notification, User } from '../types';
import { Subject, AcademicRecord, ParentNotification } from '../types';

export const currentUser: User = {
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

export const departments = [
  { code: 'CS', name: 'Computer Science' },
  { code: 'ECE', name: 'Electronics & Communication' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
  { code: 'EE', name: 'Electrical Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'CHE', name: 'Chemical Engineering' }
];

export const academicYears = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' }
];

export const mockEvents: Event[] = [];
export const mockNotes: Note[] = [];
export const mockQuestions: Question[] = [];
export const mockNotifications: Notification[] = [];
export const mockSubjects: Subject[] = [];

export const mockAcademicRecord: AcademicRecord = {
  studentId: '',
  semester: '',
  cgpa: 0,
  sgpa: 0,
  totalCredits: 0,
  overallAttendance: 0,
  isDebarred: false,
  debarredSubjects: [],
  attendance: [],
  midTermMarks: []
};

export const mockParentNotifications: ParentNotification[] = [];
