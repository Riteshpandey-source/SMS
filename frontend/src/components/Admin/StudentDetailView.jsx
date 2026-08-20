import React from 'react';
import { 
  ArrowLeft,
  ChevronRight,
  User,
  Mail,
  GraduationCap,
  Building2,
  Calendar,
  Phone,
  UserCircle,
  BookOpen,
  TrendingUp,
  Award,
  Users as UsersIcon
} from 'lucide-react';
import { adminHierarchyService } from '../../services/adminHierarchyService';

const StudentDetailView = ({ 
  student, 
  faculty, 
  academicData, 
  parentInfo, 
  assignedFaculty,
  loading, 
  onBack, 
  onBackToFaculty 
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-60 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const deptColors = adminHierarchyService.getDepartmentColor(student.department);
  
  // Calculate overall grades
  const midTermOverall = adminHierarchyService.calculateOverallGrade(academicData?.midTermMarks || []);
  const endTermOverall = adminHierarchyService.calculateOverallGrade(academicData?.endTermMarks || []);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button
          onClick={onBackToFaculty}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          Faculty List
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <button
          onClick={onBack}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          {faculty?.name || 'Students'}
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-600">{student.name}</span>
      </div>

      {/* Student Info Card */}
      <div className={`bg-white rounded-lg border-2 ${deptColors.border} p-6`}>
        <div className="flex items-start gap-6">
          <div className={`${deptColors.bg} rounded-full p-6`}>
            <User className={`w-12 h-12 ${deptColors.text}`} />
          </div>
          
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900">{student.name}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{student.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{student.department}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{adminHierarchyService.formatAcademicYear(student.academicYear)}</span>
              </div>
              
              {assignedFaculty && (
                <div className="flex items-center gap-2 text-gray-600">
                  <GraduationCap className="w-4 h-4" />
                  <span>Faculty: {assignedFaculty.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <span className={`px-3 py-1 ${deptColors.bg} ${deptColors.text} rounded-full text-sm font-medium`}>
                {student.department}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                {adminHierarchyService.formatAcademicYear(student.academicYear)}
              </span>
            </div>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Academic Records */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Academic Records</h3>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mid-Term Marks */}
          <div>
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Mid-Term Examination</h4>
              {midTermOverall.totalMax > 0 && (
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="text-center sm:text-right">
                    <div className="text-xs sm:text-sm text-gray-600">Overall</div>
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {midTermOverall.totalObtained}/{midTermOverall.totalMax}
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xs sm:text-sm text-gray-600">Percentage</div>
                    <div className="text-base sm:text-lg font-bold text-purple-600">
                      {midTermOverall.percentage}%
                    </div>
                  </div>
                  <div className={`px-3 sm:px-4 py-2 rounded-lg ${
                    midTermOverall.percentage >= 80 ? 'bg-green-100 text-green-700' :
                    midTermOverall.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                    midTermOverall.percentage >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <div className="text-xs sm:text-sm">Grade</div>
                    <div className="text-lg sm:text-xl font-bold">{midTermOverall.grade}</div>
                  </div>
                </div>
              )}
            </div>

            {academicData?.midTermMarks && academicData.midTermMarks.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marks Obtained
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Marks
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {academicData.midTermMarks.map((mark, index) => {
                        const percentage = mark.totalMarks > 0 
                          ? Math.round((mark.marksObtained / mark.totalMarks) * 100) 
                          : 0;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {mark.subject}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900">
                              {mark.marksObtained}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">
                              {mark.totalMarks}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`font-medium ${
                                percentage >= 80 ? 'text-green-600' :
                                percentage >= 60 ? 'text-blue-600' :
                                percentage >= 40 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {percentage}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`px-2 py-1 rounded font-medium ${
                                mark.grade === 'A+' || mark.grade === 'A' ? 'bg-green-100 text-green-700' :
                                mark.grade === 'B+' || mark.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                mark.grade === 'C' || mark.grade === 'D' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {mark.grade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {academicData.midTermMarks.map((mark, index) => {
                    const percentage = mark.totalMarks > 0 
                      ? Math.round((mark.marksObtained / mark.totalMarks) * 100) 
                      : 0;
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">{mark.subject}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Marks Obtained</p>
                            <p className="text-lg font-bold text-gray-900">{mark.marksObtained}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Total Marks</p>
                            <p className="text-lg font-bold text-gray-600">{mark.totalMarks}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Percentage</p>
                            <p className={`text-lg font-bold ${
                              percentage >= 80 ? 'text-green-600' :
                              percentage >= 60 ? 'text-blue-600' :
                              percentage >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {percentage}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Grade</p>
                            <span className={`inline-block px-3 py-1 rounded font-bold ${
                              mark.grade === 'A+' || mark.grade === 'A' ? 'bg-green-100 text-green-700' :
                              mark.grade === 'B+' || mark.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                              mark.grade === 'C' || mark.grade === 'D' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {mark.grade}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No mid-term marks available</p>
              </div>
            )}
          </div>

          {/* End-Term Marks */}
          <div className="pt-6 border-t border-gray-200">
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">End-Term Examination</h4>
              {endTermOverall.totalMax > 0 && (
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="text-center sm:text-right">
                    <div className="text-xs sm:text-sm text-gray-600">Overall</div>
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {endTermOverall.totalObtained}/{endTermOverall.totalMax}
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xs sm:text-sm text-gray-600">Percentage</div>
                    <div className="text-base sm:text-lg font-bold text-purple-600">
                      {endTermOverall.percentage}%
                    </div>
                  </div>
                  <div className={`px-3 sm:px-4 py-2 rounded-lg ${
                    endTermOverall.percentage >= 80 ? 'bg-green-100 text-green-700' :
                    endTermOverall.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                    endTermOverall.percentage >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <div className="text-xs sm:text-sm">Grade</div>
                    <div className="text-lg sm:text-xl font-bold">{endTermOverall.grade}</div>
                  </div>
                </div>
              )}
            </div>

            {academicData?.endTermMarks && academicData.endTermMarks.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marks Obtained
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Marks
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {academicData.endTermMarks.map((mark, index) => {
                        const percentage = mark.totalMarks > 0 
                          ? Math.round((mark.marksObtained / mark.totalMarks) * 100) 
                          : 0;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {mark.subject}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900">
                              {mark.marksObtained}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">
                              {mark.totalMarks}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`font-medium ${
                                percentage >= 80 ? 'text-green-600' :
                                percentage >= 60 ? 'text-blue-600' :
                                percentage >= 40 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {percentage}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={`px-2 py-1 rounded font-medium ${
                                mark.grade === 'A+' || mark.grade === 'A' ? 'bg-green-100 text-green-700' :
                                mark.grade === 'B+' || mark.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                mark.grade === 'C' || mark.grade === 'D' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {mark.grade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {academicData.endTermMarks.map((mark, index) => {
                    const percentage = mark.totalMarks > 0 
                      ? Math.round((mark.marksObtained / mark.totalMarks) * 100) 
                      : 0;
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">{mark.subject}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Marks Obtained</p>
                            <p className="text-lg font-bold text-gray-900">{mark.marksObtained}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Total Marks</p>
                            <p className="text-lg font-bold text-gray-600">{mark.totalMarks}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Percentage</p>
                            <p className={`text-lg font-bold ${
                              percentage >= 80 ? 'text-green-600' :
                              percentage >= 60 ? 'text-blue-600' :
                              percentage >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {percentage}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Grade</p>
                            <span className={`inline-block px-3 py-1 rounded font-bold ${
                              mark.grade === 'A+' || mark.grade === 'A' ? 'bg-green-100 text-green-700' :
                              mark.grade === 'B+' || mark.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                              mark.grade === 'C' || mark.grade === 'D' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {mark.grade}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No end-term marks available</p>
              </div>
            )}
          </div>

          {/* Attendance */}
          {academicData?.attendance && (
            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Attendance</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-600 mb-1">Present</div>
                  <div className="text-2xl font-bold text-green-700">
                    {academicData.attendance.present}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">Total Classes</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {academicData.attendance.total}
                  </div>
                </div>
                <div className={`rounded-lg p-4 border ${
                  academicData.attendance.percentage >= 75 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`text-sm mb-1 ${
                    academicData.attendance.percentage >= 75 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Percentage
                  </div>
                  <div className={`text-2xl font-bold ${
                    academicData.attendance.percentage >= 75 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {academicData.attendance.percentage}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parent Information */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Parent/Guardian Information</h3>
          </div>
        </div>

        <div className="p-6">
          {parentInfo && (parentInfo.name !== 'Not provided' || parentInfo.email !== 'Not provided') ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-3">
                  <UserCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="text-base font-medium text-gray-900">{parentInfo.name}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-purple-100 rounded-full p-3">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="text-base font-medium text-gray-900">{parentInfo.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-3">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Phone</div>
                  <div className="text-base font-medium text-gray-900">{parentInfo.phone}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-orange-100 rounded-full p-3">
                  <UsersIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Relationship</div>
                  <div className="text-base font-medium text-gray-900">{parentInfo.relationship}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No parent information available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailView;
