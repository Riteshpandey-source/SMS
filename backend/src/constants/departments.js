// Department constants for CampusBuddy application

// Department codes and their full names
const DEPARTMENTS = {
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
const DEPARTMENT_CODES = Object.keys(DEPARTMENTS);

// Array of academic department codes (excluding Administration)
const ACADEMIC_DEPARTMENT_CODES = DEPARTMENT_CODES.filter(code => code !== 'Administration');

// Department validation array for Joi schemas
const DEPARTMENT_VALIDATION_ARRAY = [...ACADEMIC_DEPARTMENT_CODES, 'Administration'];

// Get department full name by code
const getDepartmentName = (code) => {
  return DEPARTMENTS[code] || code;
};

// Get all departments as array of objects
const getDepartmentsArray = () => {
  return Object.entries(DEPARTMENTS).map(([code, name]) => ({
    code,
    name,
    value: code,
    label: name
  }));
};

// Get academic departments only (excluding Administration)
const getAcademicDepartmentsArray = () => {
  return Object.entries(DEPARTMENTS)
    .filter(([code]) => code !== 'Administration')
    .map(([code, name]) => ({
      code,
      name,
      value: code,
      label: name
    }));
};

// Validate if department code is valid
const isValidDepartment = (code) => {
  return DEPARTMENT_CODES.includes(code);
};

// Validate if department code is academic (not Administration)
const isAcademicDepartment = (code) => {
  return ACADEMIC_DEPARTMENT_CODES.includes(code);
};

module.exports = {
  DEPARTMENTS,
  DEPARTMENT_CODES,
  ACADEMIC_DEPARTMENT_CODES,
  DEPARTMENT_VALIDATION_ARRAY,
  getDepartmentName,
  getDepartmentsArray,
  getAcademicDepartmentsArray,
  isValidDepartment,
  isAcademicDepartment
};