import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  Eye, 
  EyeOff, 
  Save, 
  Upload, 
  Trash2, 
  Settings as SettingsIcon, 
  KeyRound, 
  Palette, 
  Lock 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState('account'); // 'account', 'security', 'notifications', 'appearance', 'privacy'
  const [saving, setSaving] = useState(false);
  
  // Account Form State
  const [accountForm, setAccountForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '', // Supported fields in local state
    department: user?.department || '',
    academicYear: user?.academicYear || 1
  });

  // Security Form State
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState({
    email: true,
    academic: true,
    assignment: true,
    attendance: true,
    event: true,
    system: true
  });

  // Appearance State
  const [appearance, setAppearance] = useState({
    theme: localStorage.getItem('theme') || 'default-navy'
  });

  // Privacy State
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: true,
    searchable: true
  });

  // Avatar State
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sync state with user context on mount or change
  useEffect(() => {
    if (user) {
      setAccountForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        academicYear: user.academicYear || 1
      });
    }
  }, [user]);

  // Load preferences on mount
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const prefs = await userService.getPreferences();
        if (prefs) {
          if (prefs.notifications) setNotifications(prev => ({ ...prev, ...prefs.notifications }));
          if (prefs.privacy) setPrivacy(prev => ({ ...prev, ...prefs.privacy }));
        }
      } catch (err) {
        console.warn('Failed to load user preferences:', err);
      }
    };
    fetchPrefs();
  }, []);

  const handleAccountSave = async (e) => {
    e.preventDefault();
    if (!accountForm.name) {
      return toast.error('Full name is required');
    }

    try {
      setSaving(true);
      const updateData = {
        name: accountForm.name
      };
      
      // Role specific fields
      if (user.role === 'student') {
        updateData.department = accountForm.department;
        updateData.academicYear = Number(accountForm.academicYear);
      } else if (user.role === 'faculty') {
        updateData.department = accountForm.department;
      }

      const updatedUser = await userService.updateProfile(updateData);
      
      // Persist locally if phone changed (as mock fields)
      const mergedUser = {
        ...updatedUser,
        phone: accountForm.phone
      };
      
      updateUser(mergedUser);
      toast.success('Settings updated successfully.');
    } catch (err) {
      console.error('Failed to save account settings:', err);
      toast.error('Unable to save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      return toast.error('All fields are required');
    }

    if (passwordForm.next !== passwordForm.confirm) {
      return toast.error('New passwords do not match');
    }

    const strongEnough = passwordForm.next.length >= 8 &&
      /[A-Z]/.test(passwordForm.next) &&
      /[a-z]/.test(passwordForm.next) &&
      /\d/.test(passwordForm.next) &&
      /[@$!%*?&#]/.test(passwordForm.next);

    if (!strongEnough) {
      return toast.error('New password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters');
    }

    try {
      setPasswordSubmitting(true);
      await authService.changePassword(
        passwordForm.current,
        passwordForm.next,
        passwordForm.confirm
      );
      toast.success('Password updated successfully.');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Unable to save your changes. Please try again.';
      toast.error(message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handlePreferencesSave = async (section) => {
    try {
      setSaving(true);
      const updatedPrefs = {
        notifications: section === 'notifications' ? notifications : undefined,
        privacy: section === 'privacy' ? privacy : undefined
      };
      
      await userService.updatePreferences(updatedPrefs);
      toast.success('Settings updated successfully.');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast.error('Unable to save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (themeName) => {
    setAppearance({ theme: themeName });
    localStorage.setItem('theme', themeName);
    document.documentElement.className = 'theme-' + themeName;
    toast.success('Settings updated successfully.');
  };

  // Avatar Handlers
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return toast.error('Please select an image file');
      }
      if (file.size > 10 * 1024 * 1024) {
        return toast.error('Image size must be under 10MB');
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSelectedAvatar = async () => {
    if (!avatarFile) return;

    try {
      setUploadingAvatar(true);
      const result = await userService.uploadAvatar(avatarFile);
      
      // Sync auth context
      updateUser({ ...user, avatar: JSON.stringify(result) });
      toast.success('Profile photo updated successfully.');
      setAvatarFile(null);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast.error('Unable to save profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const deleteCurrentAvatar = async () => {
    try {
      setUploadingAvatar(true);
      await userService.deleteAvatar();
      updateUser({ ...user, avatar: null });
      setAvatarPreview(null);
      toast.success('Profile photo removed.');
    } catch (err) {
      console.error('Failed to remove avatar:', err);
      toast.error('Unable to remove profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) {
      try {
        const avatarData = JSON.parse(user.avatar);
        return avatarData.medium?.url || avatarData.small?.url;
      } catch (e) {
        // Fallback
      }
    }
    return userService.getAvatarUrl(user?.id, 'medium');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden min-h-[500px]">
      <div className="flex flex-col md:flex-row h-full">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 border-r border-slate-100 bg-slate-50/50 p-4 space-y-1">
          <h2 className="text-[10px] font-black text-slate-450 uppercase tracking-widest px-3 mb-3">Settings Panel</h2>
          <button
            onClick={() => setActiveSection('account')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSection === 'account' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4 text-[#c5a880]" />
            <span>Account Details</span>
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSection === 'security' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4 text-[#c5a880]" />
            <span>Security</span>
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSection === 'notifications' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4 text-[#c5a880]" />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveSection('appearance')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSection === 'appearance' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-4 h-4 text-[#c5a880]" />
            <span>Appearance</span>
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              activeSection === 'privacy' 
                ? 'bg-slate-900 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4 text-[#c5a880]" />
            <span>Privacy</span>
          </button>
        </aside>

        {/* Content View Workspace */}
        <main className="flex-1 p-6 sm:p-8">
          
          {/* 1. ACCOUNT SECTION */}
          {activeSection === 'account' && (
            <form onSubmit={handleAccountSave} className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Account Profile</h3>
                <p className="text-xs text-slate-500 font-medium">Update your display settings, phone contact and photo.</p>
              </div>

              {/* Avatar management block */}
              <div className="flex flex-col sm:flex-row items-center gap-4 py-4 border-y border-slate-100">
                <div className="relative">
                  <img
                    src={getAvatarUrl()}
                    alt={user?.name}
                    className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-100"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&size=64&background=0f172a&color=fff&bold=true`;
                    }}
                  />
                  <label className="absolute -bottom-1 -right-1 bg-white hover:bg-slate-50 text-slate-700 p-1.5 rounded-lg border border-slate-200 cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {avatarFile && (
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={uploadSelectedAvatar}
                      className="px-4 py-2 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl border border-slate-800 hover:bg-slate-800"
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Save New Photo'}
                    </button>
                  )}
                  {user?.avatar && (
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={deleteCurrentAvatar}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-rose-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Account properties fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    disabled
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                  <input
                    type="text"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                  />
                </div>
                {user?.role === 'student' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                      <select
                        value={accountForm.department}
                        onChange={(e) => setAccountForm(prev => ({ ...prev, department: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                      >
                        {['CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL'].map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Academic Year</label>
                      <select
                        value={accountForm.academicYear}
                        onChange={(e) => setAccountForm(prev => ({ ...prev, academicYear: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                      >
                        {[1, 2, 3, 4].map(y => (
                          <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {user?.role === 'faculty' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                    <select
                      value={accountForm.department}
                      onChange={(e) => setAccountForm(prev => ({ ...prev, department: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                    >
                      {['CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', 'Administration'].map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[#0B1220] hover:bg-[#1a253a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#c5a880]" />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. SECURITY SECTION */}
          {activeSection === 'security' && (
            <form onSubmit={handlePasswordSave} className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Change Password</h3>
                <p className="text-xs text-slate-500 font-medium">Keep your credentials secure. Password updates must be strong.</p>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.next}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                    placeholder="Min 8 chars, uppercase, digit, symbol"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirm New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
                    required
                  />
                </div>
                
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    className="rounded border-slate-350 text-slate-900"
                  />
                  <span>Show Passwords</span>
                </label>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-6 py-3 bg-[#0B1220] hover:bg-[#1a253a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-[#c5a880]" />
                  <span>{passwordSubmitting ? 'Updating...' : 'Save Password'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. NOTIFICATIONS SECTION */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Notification Preferences</h3>
                <p className="text-xs text-slate-500 font-medium">Control what announcements and digests you receive.</p>
              </div>

              <div className="space-y-4 py-4 border-y border-slate-100">
                {[
                  { key: 'email', label: 'Email Digests', desc: 'Summary of weekly grades and timetables.' },
                  { key: 'academic', label: 'Academic Alerts', desc: 'Updates to course structures, GPA mappings.' },
                  { key: 'assignment', label: 'Assignment Releases', desc: 'Notifications on pending deadlines.' },
                  { key: 'attendance', label: 'Attendance Flagging', desc: 'Risk status warnings and updates.' },
                  { key: 'event', label: 'Event Registrations', desc: 'News and schedules of college guest events.' },
                  { key: 'system', label: 'System Security Alerts', desc: 'Sign-ins, login attempts and platform notices.' }
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-4 p-4 rounded-xl border border-slate-150 hover:bg-slate-50 transition-colors select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="mt-1 rounded border-slate-350 text-[#c5a880] focus:ring-[#c5a880]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-none">{item.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-semibold">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => handlePreferencesSave('notifications')}
                  disabled={saving}
                  className="px-6 py-3 bg-[#0B1220] hover:bg-[#1a253a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#c5a880]" />
                  <span>{saving ? 'Updating...' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. APPEARANCE SECTION */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Display & Theme</h3>
                <p className="text-xs text-slate-500 font-medium">Expose UI presentation themes for local display.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-slate-100">
                {[
                  { value: 'default-navy', name: 'Midnight Navy', desc: 'Classic Brand Theme', colors: 'bg-[#0B1220]' },
                  { value: 'light-clean', name: 'Light Clean', desc: 'White workspace light design', colors: 'bg-white border' },
                  { value: 'dark-nordic', name: 'Dark Nordic', desc: 'Sleek dark mode theme', colors: 'bg-[#0f172a]' }
                ].map((themeItem) => (
                  <button
                    key={themeItem.value}
                    onClick={() => handleThemeChange(themeItem.value)}
                    className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                      appearance.theme === themeItem.value 
                        ? 'border-[#c5a880] ring-2 ring-[#c5a880]/10 bg-slate-50' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`h-12 w-full rounded-lg mb-3 ${themeItem.colors}`}></div>
                    <span className="text-xs font-bold text-slate-900 leading-none">{themeItem.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-semibold">{themeItem.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. PRIVACY SECTION */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Privacy & Visibility</h3>
                <p className="text-xs text-slate-500 font-medium">Manage how other users view your profile on CampusBuddy.</p>
              </div>

              <div className="space-y-4 py-4 border-y border-slate-100">
                {[
                  { key: 'profileVisible', label: 'Public Profile Visibility', desc: 'Allow other students and faculty to view your profile page.' },
                  { key: 'showEmail', label: 'Show Email Address', desc: 'Expose email address to verified students on forum queries.' },
                  { key: 'searchable', label: 'Search Index Listing', desc: 'Include name in search lists for department registrations.' }
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-4 p-4 rounded-xl border border-slate-150 hover:bg-slate-50 transition-colors select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacy[item.key]}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="mt-1 rounded border-slate-350 text-[#c5a880] focus:ring-[#c5a880]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-none">{item.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-semibold">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => handlePreferencesSave('privacy')}
                  disabled={saving}
                  className="px-6 py-3 bg-[#0B1220] hover:bg-[#1a253a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#c5a880]" />
                  <span>{saving ? 'Updating...' : 'Save Privacy Options'}</span>
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Settings;
