// Department constants for CampusBuddy frontend application

// Department codes and their full names
export const DEPARTMENTS = {
  CS: 'Computer Science',
  ECE: 'Electronics and Communication Engineering',
  ME: 'Mechanical Engineering',
  EE: 'Electrical Engineering',
  IT: 'Information Technology',
  CSAI: 'Computer Science and Artificial Intelligence',
  AIDS: 'Artificial Intelligence and Data Science',
  CIVIL: 'Civil Engineering',
  Administration: 'Administration'
};

// Array of department codes (for validation)
export const DEPARTMENT_CODES = Object.keys(DEPARTMENTS);

// Array of academic department codes (excluding Administration)
export const ACADEMIC_DEPARTMENT_CODES = DEPARTMENT_CODES.filter(code => code !== 'Administration');

// Get department full name by code
export const getDepartmentName = (code) => {
  return DEPARTMENTS[code] || code;
};

// Get all departments as options for select components
export const getDepartmentOptions = () => {
  return Object.entries(DEPARTMENTS).map(([code, name]) => ({
    value: code,
    label: name,
    code,
    name
  }));
};

// Get academic departments only (excluding Administration)
export const getAcademicDepartmentOptions = () => {
  return Object.entries(DEPARTMENTS)
    .filter(([code]) => code !== 'Administration')
    .map(([code, name]) => ({
      value: code,
      label: name,
      code,
      name
    }));
};

// Validate if department code is valid
export const isValidDepartment = (code) => {
  return DEPARTMENT_CODES.includes(code);
};

// Validate if department code is academic (not Administration)
export const isAcademicDepartment = (code) => {
  return ACADEMIC_DEPARTMENT_CODES.includes(code);
};

// Department colors for UI (optional)
export const DEPARTMENT_COLORS = {
  CS: '#3B82F6',      // Blue
  ECE: '#8B5CF6',     // Purple
  ME: '#EF4444',      // Red
  EE: '#F59E0B',      // Amber
  IT: '#10B981',      // Emerald
  CSAI: '#6366F1',    // Indigo
  AIDS: '#EC4899',    // Pink
  CIVIL: '#84CC16',   // Lime
  Administration: '#6B7280' // Gray
};

// Get department color
export const getDepartmentColor = (code) => {
  return DEPARTMENT_COLORS[code] || '#6B7280';
};

export default {
  DEPARTMENTS,
  DEPARTMENT_CODES,
  ACADEMIC_DEPARTMENT_CODES,
  getDepartmentName,
  getDepartmentOptions,
  getAcademicDepartmentOptions,
  isValidDepartment,
  isAcademicDepartment,
  DEPARTMENT_COLORS,
  getDepartmentColor
};