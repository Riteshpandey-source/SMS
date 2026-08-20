import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Trophy, 
  BookOpen, 
  MessageSquare, 
  Award,
  TrendingUp,
  Edit3,
  AlertCircle,
  Settings,
  Users,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import EditProfile from './EditProfile';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: ''
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Fetch profile data helper
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile();
      setProfileData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
      setError("We couldn't load your profile information. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      const data = await userService.getProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to refresh profile data:', err);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      return toast.error('Current and new password required');
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
      return toast.error('New password must be 8+ chars with upper, lower, number, special');
    }

    setPasswordSubmitting(true);
    try {
      await authService.changePassword(
        passwordForm.current,
        passwordForm.next,
        passwordForm.confirm
      );
      toast.success('Password updated');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto md:mx-0 mb-4 md:mb-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 shadow-sm max-w-md w-full mx-auto">
          <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto mb-4 bg-red-50 p-2.5 rounded-xl border border-red-100" />
          <h3 className="text-base font-bold text-gray-900 mb-1.5">Profile unavailable</h3>
          <p className="text-xs text-gray-505 leading-relaxed mb-6">
            We couldn't load your profile information. Please check your connection.
          </p>
          <button 
            onClick={fetchProfileData}
            className="w-full bg-[#0B1220] hover:bg-[#172554] text-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all duration-150 shadow-sm border border-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentUser = profileData?.user || user;
  const stats = profileData?.stats || {};
  const childUser = profileData?.child || null;

  // Role-based achievements
  const getAchievements = () => {
    if (currentUser.role === 'student') {
      return [
        { 
          icon: Trophy, 
          title: 'Top Contributor', 
          description: 'Most helpful answers this month', 
          color: 'text-yellow-600 bg-yellow-50',
          earned: stats.reputation > 100
        },
        { 
          icon: BookOpen, 
          title: 'Note Sharer', 
          description: 'Uploaded 10+ study materials', 
          color: 'text-green-600 bg-green-50',
          earned: stats.notesUploaded >= 10
        },
        { 
          icon: MessageSquare, 
          title: 'Forum Helper', 
          description: 'Answered 25+ questions', 
          color: 'text-blue-600 bg-blue-50',
          earned: stats.answersGiven >= 25
        },
        { 
          icon: Award, 
          title: 'Event Participant', 
          description: 'Attended 5+ events', 
          color: 'text-purple-600 bg-purple-50',
          earned: stats.eventsAttended >= 5
        }
      ];
    } else if (currentUser.role === 'faculty') {
      return [
        { 
          icon: BookOpen, 
          title: 'Knowledge Sharer', 
          description: 'Uploaded 20+ study materials', 
          color: 'text-green-600 bg-green-50',
          earned: stats.notesUploaded >= 20
        },
        { 
          icon: Award, 
          title: 'Event Organizer', 
          description: 'Organized 5+ successful events', 
          color: 'text-purple-600 bg-purple-50',
          earned: stats.eventsOrganized >= 5
        },
        { 
          icon: Users, 
          title: 'Mentor', 
          description: 'Helped 50+ students', 
          color: 'text-blue-600 bg-blue-50',
          earned: stats.studentsHelped >= 50
        },
        { 
          icon: Trophy, 
          title: 'Excellence Award', 
          description: 'Outstanding faculty performance', 
          color: 'text-yellow-600 bg-yellow-50',
          earned: stats.teachingRating >= 4.5
        }
      ];
    } else if (currentUser.role === 'parent') {
      return [
        { 
          icon: Users, 
          title: 'Guardian/Sponsor', 
          description: `Linked to student ${childUser?.name || 'Student'}`, 
          color: 'text-emerald-600 bg-emerald-50',
          earned: true
        },
        { 
          icon: Calendar, 
          title: 'Active Monitor', 
          description: 'Regularly tracking child progress', 
          color: 'text-[#c5a880] bg-amber-50',
          earned: true
        }
      ];
    } else { // admin
      return [
        { 
          icon: Settings, 
          title: 'System Manager', 
          description: 'Managed 100+ users', 
          color: 'text-blue-600 bg-blue-50',
          earned: stats.usersManaged >= 100
        },
        { 
          icon: Award, 
          title: 'Platform Builder', 
          description: 'Configured 10+ features', 
          color: 'text-purple-600 bg-purple-50',
          earned: stats.featuresConfigured >= 10
        },
        { 
          icon: Trophy, 
          title: 'Admin Excellence', 
          description: 'Outstanding administration', 
          color: 'text-yellow-600 bg-yellow-50',
          earned: stats.adminRating >= 4.5
        },
        { 
          icon: BookOpen, 
          title: 'Content Moderator', 
          description: 'Moderated 500+ items', 
          color: 'text-green-600 bg-green-50',
          earned: stats.contentModerated >= 500
        }
      ];
    }
  };

  // Role-based stats
  const getStatsList = () => {
    if (currentUser.role === 'student') {
      return [
        { label: 'Questions Asked', value: stats.questionsAsked || 0, icon: MessageSquare },
        { label: 'Answers Given', value: stats.answersGiven || 0, icon: MessageSquare },
        { label: 'Notes Uploaded', value: stats.notesUploaded || 0, icon: BookOpen },
        { label: 'Events Attended', value: stats.eventsAttended || 0, icon: Calendar }
      ];
    } else if (currentUser.role === 'faculty') {
      return [
        { label: 'Notes Uploaded', value: stats.notesUploaded || 0, icon: BookOpen },
        { label: 'Events Organized', value: stats.eventsOrganized || 0, icon: Calendar },
        { label: 'Students Taught', value: stats.studentsTaught || 0, icon: Users },
        { label: 'Teaching Rating', value: (stats.teachingRating || 0).toFixed(1), icon: Trophy }
      ];
    } else if (currentUser.role === 'parent') {
      return [
        { label: 'Linked Student', value: childUser?.name || 'N/A', icon: User },
        { label: 'Student Year', value: childUser ? `${childUser.academicYear} Year` : 'N/A', icon: GraduationCap },
        { label: 'Department', value: childUser?.department || 'N/A', icon: BookOpen },
        { label: 'Account Status', value: currentUser.isActive ? 'Active' : 'Inactive', icon: Settings }
      ];
    } else { // admin
      return [
        { label: 'Users Managed', value: stats.usersManaged || 0, icon: Users },
        { label: 'Content Moderated', value: stats.contentModerated || 0, icon: BookOpen },
        { label: 'System Uptime', value: `${stats.systemUptime || 99.9}%`, icon: Settings },
        { label: 'Features Active', value: stats.featuresActive || 0, icon: Award }
      ];
    }
  };

  const achievements = getAchievements();
  const statsList = getStatsList();

  // Get user's academic info display
  const getAcademicInfo = () => {
    if (currentUser.role === 'student') {
      const yearSuffix = currentUser.academicYear === 1 ? 'st' : 
                        currentUser.academicYear === 2 ? 'nd' : 
                        currentUser.academicYear === 3 ? 'rd' : 'th';
      return `${currentUser.academicYear}${yearSuffix} Year Student • ${currentUser.department}`;
    } else if (currentUser.role === 'faculty') {
      return `Faculty Member • ${currentUser.department} Department`;
    } else if (currentUser.role === 'parent') {
      return `Parent / Guardian of ${childUser?.name || 'Student'}`;
    } else {
      return 'System Administrator • All Departments';
    }
  };

  // Get role-specific subtitle
  const getRoleSubtitle = () => {
    if (currentUser.role === 'student') {
      return 'Learning and Growing';
    } else if (currentUser.role === 'faculty') {
      return 'Teaching and Mentoring';
    } else if (currentUser.role === 'parent') {
      return `Supporting and Monitoring ${childUser?.name || 'Student'}`;
    } else {
      return 'Managing and Moderating';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header (Premium Dark Navy Banner) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-[#c5a880]/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <img
            src={userService.getAvatarUrl(currentUser.id) || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&size=120&background=c5a880&color=fff`}
            alt={currentUser.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
          />
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5">{currentUser.name}</h1>
            <p className="text-[#c5a880] text-sm font-bold uppercase tracking-wider mb-3">
              {currentUser.role === 'faculty' ? `Faculty · ${currentUser.department || 'Information Technology'}` : getAcademicInfo()}
            </p>
            
            {/* Horizontal Stats Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-800/80 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-white">
                <Mail className="w-3.5 h-3.5 text-[#c5a880]" />
                {currentUser.email}
              </span>
              <span>•</span>
              {currentUser.role === 'faculty' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#c5a880]" />
                    {stats.studentsTaught || 64} Students
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#c5a880]" />
                    {stats.coursesTeaching || 3} Courses
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#c5a880]" />
                    {stats.avgAttendance || '87%'} Avg Attendance
                  </span>
                </>
              )}
              {currentUser.role === 'student' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#c5a880]" />
                    CGPA: {stats.cgpa || '8.7'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#c5a880]" />
                    {stats.creditsCompleted || 64} Credits
                  </span>
                </>
              )}
              {currentUser.role === 'admin' && (
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Settings className="w-3.5 h-3.5" />
                  System Admin Access
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={() => setShowEditModal(true)}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4 text-[#c5a880]" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Role-specific Additional Section (Teaching Overview / Academic Progress) */}
      {currentUser.role === 'faculty' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center">
            <Users className="w-4 h-4 mr-2 text-green-600" />
            Teaching Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50/60 border border-green-100 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">{stats.coursesTeaching || 3}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Courses Teaching</div>
            </div>
            <div className="text-center p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.studentsTaught || 64}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Students Taught</div>
            </div>
            <div className="text-center p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
              <div className="text-2xl font-bold text-amber-600 mb-1">{stats.researchPapers || 2}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Research Papers</div>
            </div>
          </div>
        </div>
      )}

      {currentUser.role === 'student' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center">
            <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
            Academic Progress
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.cgpa || '8.7'}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Current CGPA</div>
            </div>
            <div className="text-center p-4 bg-green-50/60 border border-green-100 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">{stats.creditsCompleted || 64}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Credits Completed</div>
            </div>
            <div className="text-center p-4 bg-purple-50/60 border border-purple-100 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.coursesEnrolled || 6}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Courses Enrolled</div>
            </div>
          </div>
        </div>
      )}

      {currentUser.role === 'parent' && childUser && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center">
            <GraduationCap className="w-4 h-4 mr-2 text-blue-600" />
            Linked Student Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <div className="text-base font-bold text-emerald-600 mb-1">{childUser.name}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Student Name</div>
            </div>
            <div className="text-center p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
              <div className="text-base font-bold text-blue-600 mb-1">{childUser.department} Department</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Course Branch</div>
            </div>
            <div className="text-center p-4 bg-amber-50/60 border border-amber-100 rounded-xl">
              <div className="text-base font-bold text-amber-600 mb-1">{childUser.academicYear} Year</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Academic Year</div>
            </div>
          </div>
        </div>
      )}

      {/* Split Columns for Achievements & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements Column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center">
            <Trophy className="w-4 h-4 mr-2 text-amber-500" />
            Achievements
          </h2>
          
          <div className="space-y-4">
            {achievements.slice(0, 4).map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <div 
                  key={index} 
                  className={`flex items-start space-x-4 p-4 rounded-xl border transition-colors ${
                    achievement.earned 
                      ? 'border-indigo-105 bg-indigo-50/30' 
                      : 'border-gray-150 bg-gray-50/50 opacity-60'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${achievement.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-gray-900 mb-1 flex items-center">
                      {achievement.title}
                      {achievement.earned && (
                        <Trophy className="w-3.5 h-3.5 ml-1.5 text-yellow-500" />
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-500 font-semibold">{achievement.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6">
            {currentUser.role === 'student' && 'Recent Learning Activity'}
            {currentUser.role === 'faculty' && 'Recent Teaching Activity'}
            {currentUser.role === 'admin' && 'Recent Administrative Activity'}
          </h2>
          
          <div className="space-y-3">
            {profileData?.recentActivity?.length > 0 ? (
              profileData.recentActivity.slice(0, 4).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    currentUser.role === 'student' ? 'bg-blue-500' :
                    currentUser.role === 'faculty' ? 'bg-green-500' : 'bg-purple-500'
                  }`}></div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{activity.title}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-gray-500 font-semibold">No recent activity found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password (Less prominent compact panel at the bottom) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-3xl">
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center">
          <KeyRound className="w-4 h-4 mr-2 text-slate-500" />
          Change Account Password
        </h2>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={handlePasswordChange}>
          <div>
            <label className="text-[10px] font-bold text-slate-655 uppercase tracking-wider">Current Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((c) => ({ ...c, current: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-655 uppercase tracking-wider">New Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((c) => ({ ...c, next: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
              placeholder="8+ characters"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-655 uppercase tracking-wider">Confirm Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((c) => ({ ...c, confirm: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#c5a880]"
              placeholder="Retype password"
              required
            />
          </div>

          <div className="md:col-span-3 flex items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded border-slate-300 text-indigo-650"
              />
              Show passwords
            </label>

            <button
              type="submit"
              disabled={passwordSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white ${passwordSubmitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0B1220] hover:bg-[#1a253a]'}`}
            >
              {passwordSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Edit Profile Modal */}
      <EditProfile
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default Profile;
