import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Edit, GraduationCap, Plus, Search, Shield, Trash2, UserCheck, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { adminHierarchyService } from '../../services/adminHierarchyService';
import { useAuth } from '../../contexts/AuthContext';

const DEPARTMENTS = [
  { value: 'CS', label: 'Computer Science' },
  { value: 'ECE', label: 'Electronics & Communication' },
  { value: 'ME', label: 'Mechanical Engineering' },
  { value: 'EE', label: 'Electrical Engineering' },
  { value: 'IT', label: 'Information Technology' },
  { value: 'CSAI', label: 'CS with AI' },
  { value: 'AIDS', label: 'AI & Data Science' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'Administration', label: 'Administration' }
];

const YEARS = [1, 2, 3, 4];

const ALLOWED_DEPARTMENTS = DEPARTMENTS.map((d) => d.value);

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  department: 'CS',
  academicYear: 1,
  section: 'A',
  rollNumber: '',
  accessibleYears: [1],
  accessibleSubjects: [],
  isActive: true
};

const normalizeDepartment = (value) => {
  const raw = (value || '').trim();
  const upper = raw.toUpperCase();

  const map = {
    'INFORMATION TECHNOLOGY': 'IT',
    'IT': 'IT',
    'COMPUTER SCIENCE': 'CS',
    'CSE': 'CS',
    'CS': 'CS',
    'ELECTRONICS AND COMMUNICATION': 'ECE',
    'ELECTRONICS & COMMUNICATION': 'ECE',
    'ECE': 'ECE',
    'MECHANICAL': 'ME',
    'MECHANICAL ENGINEERING': 'ME',
    'ME': 'ME',
    'ELECTRICAL': 'EE',
    'EE': 'EE',
    'CSAI': 'CSAI',
    'CS AI': 'CSAI',
    'AI AND DS': 'AIDS',
    'AI & DS': 'AIDS',
    'AIDS': 'AIDS',
    'CIVIL': 'CIVIL',
    'ADMINISTRATION': 'Administration'
  };

  // Return mapped code or the uppercase input; do NOT fallback to CS
  return map[upper] || upper;
};

const studentEmailPreview = ({ name, department, academicYear, section, rollNumber }) => {
  const normalizedName = (name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).join('');
  if (!normalizedName) return '';
  const rollSuffix = (rollNumber || '').match(/(\d{2,})$/)?.[1]?.slice(-2);
  const suffix = rollSuffix || `${academicYear || ''}${(section || 'a').toLowerCase()}`;
  return `${normalizedName}.${(department || 'dept').toLowerCase()}${suffix}@gmail.com`;
};

const studentPasswordPreview = (name) => `${((name || '').match(/[A-Za-z]/)?.[0] || 'S').toUpperCase()}@jecrc`;

const UnifiedUserDepartmentManagement = () => {
  const { user } = useAuth();
  // Super admin (department "Administration" or unset) can see all; department-scoped admin is locked.
  const adminDepartment =
    user?.role === 'admin' && user?.department && user.department !== 'Administration'
      ? user.department
      : null;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState([
    { rollNumber: '', name: '' },
    { rollNumber: '', name: '' },
    { rollNumber: '', name: '' }
  ]);
  const [bulkMeta, setBulkMeta] = useState({
    department: normalizeDepartment(adminDepartment || user?.department || 'CS'),
    academicYear: 1,
    section: 'A'
  });
  const [quickAdminForm, setQuickAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    department: adminDepartment || 'Administration'
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const visibleDepartments = useMemo(() => {
    if (adminDepartment && adminDepartment !== 'Administration') {
      return DEPARTMENTS.filter((department) => department.value === adminDepartment);
    }
    return DEPARTMENTS;
  }, [adminDepartment]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data?.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setSelectedUserIds((current) => current.filter((id) => filteredUsers.some((item) => item._id === id)));
  }, [searchTerm, roleFilter, departmentFilter, users]);

  const filteredUsers = useMemo(() => users.filter((item) => {
    const matchesSearch = !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter;
    return matchesSearch && matchesRole && matchesDepartment;
  }), [users, searchTerm, roleFilter, departmentFilter]);

  const departmentStats = useMemo(() => visibleDepartments.map((dept) => {
    const deptUsers = users.filter((item) => item.department === dept.value);
    return {
      ...dept,
      totalUsers: deptUsers.length,
      students: deptUsers.filter((item) => item.role === 'student').length,
      faculty: deptUsers.filter((item) => item.role === 'faculty').length,
      activeUsers: deptUsers.filter((item) => item.isActive).length
    };
  }), [users, visibleDepartments]);

  const openCreateModal = (department = adminDepartment || 'CS') => {
    setEditingUserId(null);
    setCreatedCredentials(null);
    setFormData({
      ...emptyForm,
      department: user?.department && user.department !== 'Administration' ? user.department : department
    });
    setIsModalOpen(true);
  };

  const openEditModal = (selectedUser) => {
    setEditingUserId(selectedUser._id);
    setCreatedCredentials(null);
    setFormData({
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      password: '',
      role: selectedUser.role || 'student',
      department: selectedUser.department || 'CS',
      academicYear: selectedUser.academicYear || 1,
      section: selectedUser.section || 'A',
      rollNumber: selectedUser.rollNumber || '',
      accessibleYears: selectedUser.accessibleYears?.length ? selectedUser.accessibleYears : [1],
      accessibleSubjects: selectedUser.accessibleSubjects || [],
      isActive: selectedUser.isActive !== false
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setCreatedCredentials(null);
    setFormData(emptyForm);
  };

  const openBulkModal = () => {
    setBulkText('');
    setBulkRows([
      { rollNumber: '', name: '' },
      { rollNumber: '', name: '' },
      { rollNumber: '', name: '' }
    ]);
    setBulkMeta({
      department: normalizeDepartment(
        (selectedDepartment && selectedDepartment !== 'all') ? selectedDepartment :
          (departmentFilter && departmentFilter !== 'all') ? departmentFilter :
            adminDepartment || user?.department || 'CS'
      ),
      academicYear: 1,
      section: 'A'
    });
    setIsBulkModalOpen(true);
  };

  const parseBulkStudents = () => {
    const rowStudents = bulkRows
      .map((row) => ({
        rollNumber: row.rollNumber.trim(),
        name: row.name.trim()
      }))
      .filter((student) => student.name);

    const textStudents = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (!match) {
          return { name: line, rollNumber: '' };
        }

        return {
          rollNumber: match[1],
          name: match[2].trim()
        };
      })
      .filter((student) => student.name);

    return [...rowStudents, ...textStudents];
  };

  const handleRoleChange = (role) => {
    setCreatedCredentials(null);
    setFormData((current) => ({
      ...current,
      role,
      academicYear: role === 'student' ? current.academicYear || 1 : null,
      section: role === 'student' ? current.section || 'A' : '',
      rollNumber: role === 'student' ? current.rollNumber || '' : '',
      accessibleYears: role === 'faculty' ? (current.accessibleYears?.length ? current.accessibleYears : [1]) : [],
      department: role === 'admin' && adminDepartment ? adminDepartment : current.department
    }));
  };

  const toggleAccessibleYear = (year) => {
    setFormData((current) => ({
      ...current,
      accessibleYears: current.accessibleYears.includes(year)
        ? current.accessibleYears.filter((item) => item !== year)
        : [...current.accessibleYears, year].sort((a, b) => a - b)
    }));
  };

  const handleAddSubject = () => {
    setFormData(current => ({
      ...current,
      accessibleSubjects: [
        ...(current.accessibleSubjects || []),
        { subjectCode: '', subjectName: '', academicYears: [1], isActive: true }
      ]
    }));
  };

  const handleUpdateSubject = (index, field, value) => {
    setFormData(current => {
      const newSubjects = [...(current.accessibleSubjects || [])];
      newSubjects[index] = { ...newSubjects[index], [field]: value };
      return { ...current, accessibleSubjects: newSubjects };
    });
  };

  const toggleSubjectYear = (subjectIndex, year) => {
    setFormData(current => {
      const newSubjects = [...(current.accessibleSubjects || [])];
      const subject = { ...newSubjects[subjectIndex] };
      const years = subject.academicYears || [];
      
      subject.academicYears = years.includes(year)
        ? years.filter(y => y !== year)
        : [...years, year].sort((a, b) => a - b);
        
      newSubjects[subjectIndex] = subject;
      return { ...current, accessibleSubjects: newSubjects };
    });
  };

  const handleRemoveSubject = (index) => {
    setFormData(current => {
      const newSubjects = [...(current.accessibleSubjects || [])];
      newSubjects.splice(index, 1);
      return { ...current, accessibleSubjects: newSubjects };
    });
  };

  const handleQuickAdminCreate = async (event) => {
    event.preventDefault();
    if (!quickAdminForm.name.trim() || !quickAdminForm.email.trim() || !quickAdminForm.password.trim()) {
      return toast.error('Name, email, and password are required');
    }
    setCreatingAdmin(true);
    try {
      await api.post('/users', {
        name: quickAdminForm.name.trim(),
        email: quickAdminForm.email.trim(),
        password: quickAdminForm.password,
        role: 'admin',
        department: adminDepartment || quickAdminForm.department || 'Administration',
        isActive: true
      });
      toast.success('Department admin created');
      setQuickAdminForm({ name: '', email: '', password: '', department: adminDepartment || 'Administration' });
      await fetchUsers();
    } catch (error) {
      console.error('Failed to create admin', error);
      const detailMsg = error.response?.data?.error?.details?.[0]?.message;
      toast.error(detailMsg || error.response?.data?.error?.message || 'Failed to create admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) return toast.error('Name is required');
    if (!formData.department) return toast.error('Department is required');
    if (formData.role === 'student' && !formData.section.trim()) return toast.error('Section is required for student');
    if (formData.role !== 'student' && !formData.email.trim()) return toast.error('Email is required');
    if (formData.role !== 'student' && !/\S+@\S+\.\S+/.test(formData.email.trim())) return toast.error('Please enter a valid email address');
    if (!editingUserId && formData.role !== 'student' && !formData.password) return toast.error('Password is required');
    if (formData.role === 'faculty' && !formData.accessibleYears.length) return toast.error('Faculty ke liye at least one year select karo');

    const normalizedAcademicYear = formData.role === 'student'
      ? Number(formData.academicYear || 1)
      : null;

    const normalizedSection = formData.role === 'student'
      ? (formData.section || 'A').trim().toUpperCase()
      : null;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.role === 'student' ? undefined : formData.email.trim(),
        password: formData.role === 'student' ? undefined : formData.password || undefined,
        role: formData.role,
        department: normalizeDepartment(formData.department || user?.department || 'CS'),
        academicYear: normalizedAcademicYear,
        section: normalizedSection,
        rollNumber: formData.role === 'student' && formData.rollNumber.trim() ? formData.rollNumber.trim().toUpperCase() : null,
        accessibleYears: formData.role === 'faculty' ? formData.accessibleYears : [],
        accessibleSubjects: formData.role === 'faculty' ? formData.accessibleSubjects : [],
        isActive: formData.isActive
      };

      const response = editingUserId
        ? await api.put(`/users/${editingUserId}`, payload)
        : await api.post('/users', payload);

      setCreatedCredentials(response.data?.data?.generatedCredentials || null);
      toast.success(editingUserId ? 'User updated successfully' : 'User created successfully');
      await fetchUsers();

      if (!response.data?.data?.generatedCredentials) {
        closeModal();
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      const validationDetail = error.response?.data?.error?.details?.[0]?.message;
      toast.error(validationDetail || error.response?.data?.error?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (selectedUser) => {
    if (!window.confirm(`Delete ${selectedUser.name} permanently?`)) return;
    try {
      await api.delete(`/users/${selectedUser._id}`);
      toast.success('User deleted successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  };

  const toggleSelectAll = () => {
    setSelectedUserIds((current) => (
      current.length === filteredUsers.length
        ? []
        : filteredUsers.map((item) => item._id)
    ));
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length) {
      toast.error('Select at least one user');
      return;
    }

    if (!window.confirm(`Delete ${selectedUserIds.length} selected users?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) => api.delete(`/users/${userId}`))
      );

      const deletedCount = results.filter((result) => result.status === 'fulfilled').length;
      const failedCount = results.length - deletedCount;

      if (deletedCount) {
        toast.success(`${deletedCount} users deleted`);
      }

      if (failedCount) {
        toast.error(`${failedCount} users could not be deleted`);
      }

      setSelectedUserIds([]);
      await fetchUsers();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Failed to delete selected users');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = async () => {
    const students = parseBulkStudents();

    if (!students.length) {
      toast.error('Paste at least one student line');
      return;
    }

    // Sanitize to match backend validation limits and avoid blank rows
    const sanitizedStudents = students
      .map((student) => ({
        rollNumber: (student.rollNumber || '').trim().slice(0, 30),
        name: (student.name || '').trim().slice(0, 50)
      }))
      .filter((student) => student.name.length >= 2);

    if (!sanitizedStudents.length) {
      toast.error('Koi valid student name nahi mila (min 2 chars)');
      return;
    }

    const payload = {
      department: normalizeDepartment(bulkMeta.department || user?.department),
      academicYear: Number(bulkMeta.academicYear),
      section: bulkMeta.section.trim().toUpperCase(),
      students: sanitizedStudents
    };

    if (!ALLOWED_DEPARTMENTS.includes(payload.department)) {
      toast.error(`Invalid department: ${payload.department}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/users/bulk-students', payload, {
        timeout: 120000
      });

      const summary = response.data?.data?.summary;
      toast.success(`${summary?.created || 0} students created`);
      await fetchUsers();
      setIsBulkModalOpen(false);
    } catch (error) {
      console.error('Bulk create failed:', error);
      const detail = error.response?.data?.error?.details?.[0]?.message;
      toast.error(detail || error.response?.data?.error?.message || 'Failed to bulk create students');
      console.error('Bulk payload used:', {
        department: payload.department,
        academicYear: payload.academicYear,
        section: payload.section,
        studentsCount: sanitizedStudents.length,
        sample: sanitizedStudents[0],
        backendResponse: error.response?.data
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateBulkRow = (index, field, value) => {
    setBulkRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const addBulkRow = () => {
    setBulkRows((current) => [...current, { rollNumber: '', name: '' }]);
  };

  const removeBulkRow = (index) => {
    setBulkRows((current) => current.length === 1
      ? current
      : current.filter((_, rowIndex) => rowIndex !== index));
  };

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">Loading department-wise admin data...</div>;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {departmentStats.map((dept) => {
          const colors = adminHierarchyService.getDepartmentColor(dept.value);
          const isSelected = selectedDepartment === dept.value;
          return (
            <button
              key={dept.value}
              type="button"
              onClick={() => {
                setSelectedDepartment(dept.value);
                setDepartmentFilter(dept.value);
              }}
              className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                isSelected 
                  ? 'bg-gradient-to-br from-white to-purple-50/30 border-purple-300 shadow-md ring-1 ring-purple-400' 
                  : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-sm'
              }`}
            >
              {/* Decorative top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600`} />
              
              <div className="mb-4 flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${colors.bg || 'bg-slate-100'} ${colors.text || 'text-slate-700'} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200">
                  <Plus className="h-3.5 w-3.5" /> Add
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">{dept.label}</h3>
              
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
                  <p className="text-xl font-bold text-slate-700 mt-0.5">{dept.totalUsers}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Students</p>
                  <p className="text-xl font-bold text-slate-700 mt-0.5">{dept.students}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Faculty</p>
                  <p className="text-xl font-bold text-slate-700 mt-0.5">{dept.faculty}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{dept.activeUsers}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Users Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md backdrop-blur-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Users & Departments</h2>
            <p className="text-slate-500 text-sm">Create, import, and manage student, faculty, and administrator accounts.</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openCreateModal(selectedDepartment || departmentFilter || 'CS')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-white font-medium hover:bg-purple-700 transition-all duration-200 shadow-md shadow-purple-200 active:scale-95"
            >
              <Plus className="h-4.5 w-4.5" />
              Add User
            </button>
            <button
              type="button"
              onClick={openBulkModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-2.5 text-purple-700 font-medium hover:bg-purple-100 transition-all duration-200 active:scale-95"
            >
              <Users className="h-4.5 w-4.5" />
              Bulk Import Students
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={!selectedUserIds.length || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-red-700 font-medium hover:bg-red-100 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              <Trash2 className="h-4.5 w-4.5" />
              Delete Selected
            </button>
          </div>
        </div>

        {/* Quick Create Department Admin Panel */}
        <div className="mb-6 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-blue-150 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-base font-bold text-blue-900">Quick Department Admin Setup</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {adminDepartment ? (
                    <>Create an administrative account scoped to: <span className="font-bold underline">{adminDepartment}</span></>
                  ) : (
                    "Create a department-scoped administrative account."
                  )}
                </p>
              </div>
              <form onSubmit={handleQuickAdminCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-5 items-end w-full lg:w-auto">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={quickAdminForm.name}
                  onChange={(e) => setQuickAdminForm((c) => ({ ...c, name: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={quickAdminForm.email}
                  onChange={(e) => setQuickAdminForm((c) => ({ ...c, email: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={quickAdminForm.password}
                  onChange={(e) => setQuickAdminForm((c) => ({ ...c, password: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
                  required
                />
                <select
                  value={quickAdminForm.department}
                  onChange={(e) => setQuickAdminForm((c) => ({ ...c, department: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 disabled:opacity-70 disabled:bg-slate-50"
                  disabled={!!adminDepartment}
                  required
                >
                  {visibleDepartments.map((dept) => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all duration-200 disabled:opacity-70 active:scale-95 whitespace-nowrap"
                >
                  {creatingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Selected Users Indicator */}
        {!!selectedUserIds.length && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-700 font-medium flex items-center justify-between">
            <span>{selectedUserIds.length} users selected for actions</span>
            <button type="button" onClick={() => setSelectedUserIds([])} className="text-xs underline hover:text-red-900">Clear selection</button>
          </div>
        )}

        {/* Filter controls */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search by name, email, roll number..." 
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 shadow-sm" 
            />
          </div>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 shadow-sm"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admins</option>
          </select>
          <select 
            value={departmentFilter} 
            onChange={(e) => setDepartmentFilter(e.target.value)} 
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 shadow-sm"
          >
            <option value="all">All Departments</option>
            {visibleDepartments.map((department) => (
              <option key={department.value} value={department.value}>{department.label}</option>
            ))}
          </select>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-inner">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-5 py-3.5 text-left w-12">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={toggleSelectAll}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-5 py-3.5 text-left font-bold">User</th>
                <th className="px-5 py-3.5 text-left font-bold">Role</th>
                <th className="px-5 py-3.5 text-left font-bold">Department</th>
                <th className="px-5 py-3.5 text-left font-bold">Year / Access</th>
                <th className="px-5 py-3.5 text-left font-bold">Status</th>
                <th className="px-5 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((selectedUser) => (
                <tr 
                  key={selectedUser._id}
                  className="hover:bg-slate-50/50 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(selectedUser._id)}
                      onChange={() => toggleUserSelection(selectedUser._id)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200 shadow-sm overflow-hidden">
                        {selectedUser.avatar ? (
                          <img src={selectedUser.avatar} alt={selectedUser.name} className="h-full w-full object-cover" />
                        ) : (
                          selectedUser.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{selectedUser.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{selectedUser.email}</div>
                        {selectedUser.rollNumber && <div className="text-[10px] text-purple-600 font-semibold mt-0.5">Roll: {selectedUser.rollNumber}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                      selectedUser.role === 'student' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        selectedUser.role === 'faculty' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {selectedUser.role === 'student' ? <GraduationCap className="h-3.5 w-3.5" /> : selectedUser.role === 'faculty' ? <UserCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">{selectedUser.department || '-'}</td>
                  <td className="px-5 py-4 font-medium text-slate-600">
                    {selectedUser.role === 'student'
                      ? `Year ${selectedUser.academicYear || '-'}${selectedUser.section ? ` • Sec ${selectedUser.section}` : ''}`
                      : selectedUser.role === 'faculty'
                        ? `Years: ${(selectedUser.accessibleYears || []).join(', ') || '-'}`
                        : 'System Access'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selectedUser.isActive 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => openEditModal(selectedUser)} 
                        className="rounded-xl bg-slate-50 p-2 text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200 border border-slate-100"
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(selectedUser)} 
                        className="rounded-xl bg-slate-50 p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 border border-slate-100"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400 font-medium">No users found matching current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{editingUserId ? 'Edit User' : 'Create User'}</h3>
                <p className="text-sm text-gray-500">Admin yahin se student aur faculty account bana sakta hai.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto space-y-4 p-5">
              {createdCredentials && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-900">Generated student credentials</p>
                  <p className="mt-2 text-sm text-emerald-800">Email: {createdCredentials.email}</p>
                  <p className="text-sm text-emerald-800">Password: {createdCredentials.password}</p>
                  <p className="mt-2 text-xs text-emerald-700">Student later forgot-password flow se email ke through password reset kar sakta hai.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => { setCreatedCredentials(null); setFormData((current) => ({ ...current, name: e.target.value })); }} className="rounded-lg border px-3 py-2" required />
                <select value={formData.role} onChange={(e) => handleRoleChange(e.target.value)} className="rounded-lg border px-3 py-2">
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
                <select value={formData.department} onChange={(e) => { setCreatedCredentials(null); setFormData((current) => ({ ...current, department: e.target.value })); }} className="rounded-lg border px-3 py-2" disabled={!!adminDepartment}>
                  {visibleDepartments.map((department) => (
                    <option key={department.value} value={department.value}>{department.label}</option>
                  ))}
                </select>

                {formData.role === 'student' && <select value={formData.academicYear} onChange={(e) => { setCreatedCredentials(null); setFormData((current) => ({ ...current, academicYear: Number(e.target.value) })); }} className="rounded-lg border px-3 py-2">{YEARS.map((year) => <option key={year} value={year}>Year {year}</option>)}</select>}
                {formData.role === 'student' && <input type="text" placeholder="Section" value={formData.section} onChange={(e) => { setCreatedCredentials(null); setFormData((current) => ({ ...current, section: e.target.value.toUpperCase() })); }} className="rounded-lg border px-3 py-2" maxLength={10} />}
                {formData.role === 'student' && <input type="text" placeholder="Roll Number (optional)" value={formData.rollNumber} onChange={(e) => setFormData((current) => ({ ...current, rollNumber: e.target.value.toUpperCase() }))} className="rounded-lg border px-3 py-2" maxLength={30} />}

                {formData.role !== 'student' && <input type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))} className="rounded-lg border px-3 py-2" required />}
                {formData.role !== 'student' && <input type="password" placeholder={editingUserId ? 'New Password (optional)' : 'Password'} value={formData.password} onChange={(e) => setFormData((current) => ({ ...current, password: e.target.value }))} className="rounded-lg border px-3 py-2" required={!editingUserId} />}
              </div>

              {formData.role === 'student' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="font-medium text-blue-900">Auto-generated student credentials</p>
                  <p className="mt-2 text-sm text-blue-800">Email preview: {studentEmailPreview(formData) || 'Enter student name to generate email'}</p>
                  <p className="text-sm text-blue-800">Password preview: {studentPasswordPreview(formData.name)}</p>
                  <p className="mt-2 text-xs text-blue-700">Roll number ke last digits milne par email pattern example: riteshpandey.it27@gmail.com</p>
                </div>
              )}

              {formData.role === 'faculty' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 font-medium text-gray-900">Faculty Accessible Years</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {YEARS.map((year) => (
                        <label key={year} className="flex items-center gap-2">
                          <input type="checkbox" checked={formData.accessibleYears.includes(year)} onChange={() => toggleAccessibleYear(year)} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                          <span className="text-sm text-gray-700">Year {year}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-medium text-gray-900">Accessible Subjects (Optional)</p>
                      <button type="button" onClick={handleAddSubject} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-purple-700 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Add Subject
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(formData.accessibleSubjects || []).map((subject, idx) => (
                        <div key={idx} className="relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm group">
                          <button type="button" onClick={() => handleRemoveSubject(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200" title="Remove Subject">
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Subject Code</label>
                              <input type="text" value={subject.subjectCode} onChange={(e) => handleUpdateSubject(idx, 'subjectCode', e.target.value.toUpperCase())} placeholder="e.g. CS101" className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500/20 outline-none" required />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Subject Name</label>
                              <input type="text" value={subject.subjectName} onChange={(e) => handleUpdateSubject(idx, 'subjectName', e.target.value)} placeholder="e.g. Data Structures" className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-purple-500/20 outline-none" required />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Taught In Years</label>
                            <div className="flex flex-wrap gap-4">
                              {YEARS.map(year => (
                                <label key={year} className="flex items-center gap-1.5">
                                  <input type="checkbox" checked={(subject.academicYears || []).includes(year)} onChange={() => toggleSubjectYear(idx, year)} className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                                  <span className="text-xs text-gray-600">Year {year}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(formData.accessibleSubjects || []).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No subjects assigned yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData((current) => ({ ...current, isActive: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Active User</span>
              </label>

              <div className="sticky bottom-0 flex justify-end gap-3 bg-white pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Bulk Import Students</h3>
                <p className="text-sm text-gray-500">Har line me `roll-number space student-name` paste karo.</p>
              </div>
              <button type="button" onClick={() => setIsBulkModalOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <select
                    value={bulkMeta.department}
                    onChange={(e) => setBulkMeta((current) => ({
                      ...current,
                      department: normalizeDepartment(e.target.value)
                    }))}
                    className="rounded-lg border px-3 py-2"
                  >
                    {visibleDepartments.map((department) => (
                      <option key={department.value} value={department.value}>{department.label}</option>
                    ))}
                  </select>
                <select value={bulkMeta.academicYear} onChange={(e) => setBulkMeta((current) => ({ ...current, academicYear: Number(e.target.value) }))} className="rounded-lg border px-3 py-2">
                  {YEARS.map((year) => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
                <input type="text" value={bulkMeta.section} onChange={(e) => setBulkMeta((current) => ({ ...current, section: e.target.value.toUpperCase() }))} placeholder="Section" className="rounded-lg border px-3 py-2" maxLength={10} />
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={12}
                className="w-full rounded-xl border px-3 py-3 font-mono text-sm"
                placeholder={`23EJCCS001 RAHUL SHARMA\n23EJCCS002 PRIYA GUPTA\n23EJCCS027 RITESH PANDEY`}
              />

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                Parsed students: {parseBulkStudents().length}
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 bg-white pt-2">
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleBulkCreate} disabled={submitting} className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50">
                  {submitting ? 'Importing...' : 'Create Students'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedUserDepartmentManagement;
