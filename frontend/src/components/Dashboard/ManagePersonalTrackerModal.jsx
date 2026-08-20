import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ManagePersonalTrackerModal = ({ isOpen, onClose, user, onUpdate }) => {
  if (!isOpen) return null;

  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('deadlines'); // 'deadlines' or 'progress'
  const [loading, setLoading] = useState(false);

  // Local state for edits
  const [deadlines, setDeadlines] = useState(user?.personalDeadlines || []);
  const [progress, setProgress] = useState(user?.personalProgress || []);

  const colorOptions = [
    { label: 'Blue', value: 'text-blue-700 bg-blue-50 border border-blue-100 font-semibold' },
    { label: 'Red', value: 'text-red-700 bg-red-50 border border-red-100 font-bold' },
    { label: 'Amber', value: 'text-amber-700 bg-amber-50 border border-amber-100 font-semibold' },
    { label: 'Green', value: 'text-green-700 bg-green-50 border border-green-100 font-semibold' },
    { label: 'Indigo', value: 'text-indigo-700 bg-indigo-50 border border-indigo-100 font-semibold' },
  ];

  const progressColorOptions = [
    { label: 'Blue', value: 'bg-blue-500' },
    { label: 'Green', value: 'bg-green-600' },
    { label: 'Gold', value: 'bg-[#C6A15B]' },
    { label: 'Indigo', value: 'bg-indigo-650' },
    { label: 'Purple', value: 'bg-purple-500' },
  ];

  // Deadline Handlers
  const handleAddDeadline = () => {
    setDeadlines([...deadlines, { title: '', dueDate: new Date().toISOString().split('T')[0], color: colorOptions[0].value }]);
  };

  const handleUpdateDeadline = (index, field, value) => {
    const newDeadlines = [...deadlines];
    newDeadlines[index][field] = value;
    setDeadlines(newDeadlines);
  };

  const handleRemoveDeadline = (index) => {
    const newDeadlines = [...deadlines];
    newDeadlines.splice(index, 1);
    setDeadlines(newDeadlines);
  };

  // Progress Handlers
  const handleAddProgress = () => {
    setProgress([...progress, { semester: `Semester ${progress.length + 1}`, gpa: 0, max: 10, color: progressColorOptions[0].value }]);
  };

  const handleUpdateProgress = (index, field, value) => {
    const newProgress = [...progress];
    newProgress[index][field] = value;
    setProgress(newProgress);
  };

  const handleRemoveProgress = (index) => {
    const newProgress = [...progress];
    newProgress.splice(index, 1);
    setProgress(newProgress);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Ensure numeric fields
      const formattedProgress = progress.map(p => ({
        ...p,
        gpa: parseFloat(p.gpa) || 0,
        max: parseFloat(p.max) || 10
      }));

      const res = await api.patch('/users/personal-tracker', {
        personalDeadlines: deadlines,
        personalProgress: formattedProgress
      });

      if (res.data.success) {
        toast.success('Personal tracker updated!');
        updateUser(res.data.data); // Update AuthContext
        if (onUpdate) onUpdate(); // Trigger parent re-render if needed
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Failed to update personal tracker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Manage Personal Tracker</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-2">
          <button
            onClick={() => setActiveTab('deadlines')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'deadlines' ? 'border-[#C6A15B] text-[#C6A15B]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upcoming Deadlines
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'progress' ? 'border-[#C6A15B] text-[#C6A15B]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Academic Progress
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {activeTab === 'deadlines' ? (
            <div className="space-y-4">
              {deadlines.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No deadlines added yet.</p>
              ) : (
                deadlines.map((deadline, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Title</label>
                      <input 
                        type="text" 
                        value={deadline.title}
                        onChange={(e) => handleUpdateDeadline(index, 'title', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                        placeholder="e.g. DBMS Assignment"
                      />
                    </div>
                    <div className="w-full sm:w-1/3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Due Date</label>
                      <input 
                        type="date" 
                        value={deadline.dueDate ? new Date(deadline.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleUpdateDeadline(index, 'dueDate', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Color</label>
                      <select
                        value={deadline.color}
                        onChange={(e) => handleUpdateDeadline(index, 'color', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                      >
                        {colorOptions.map(c => (
                          <option key={c.label} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => handleRemoveDeadline(index)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
              <button 
                onClick={handleAddDeadline}
                className="flex items-center gap-2 text-sm font-semibold text-[#C6A15B] bg-[#C6A15B]/10 px-4 py-2 rounded-xl hover:bg-[#C6A15B]/20 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Deadline
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {progress.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No progress records added yet.</p>
              ) : (
                progress.map((prog, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Semester Name</label>
                      <input 
                        type="text" 
                        value={prog.semester}
                        onChange={(e) => handleUpdateProgress(index, 'semester', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                        placeholder="e.g. Semester 1"
                      />
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">GPA</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={prog.gpa}
                        onChange={(e) => handleUpdateProgress(index, 'gpa', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Max GPA</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="1"
                        value={prog.max}
                        onChange={(e) => handleUpdateProgress(index, 'max', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Color</label>
                      <select
                        value={prog.color}
                        onChange={(e) => handleUpdateProgress(index, 'color', e.target.value)}
                        className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#C6A15B]/20 outline-none"
                      >
                        {progressColorOptions.map(c => (
                          <option key={c.label} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => handleRemoveProgress(index)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
              <button 
                onClick={handleAddProgress}
                className="flex items-center gap-2 text-sm font-semibold text-[#C6A15B] bg-[#C6A15B]/10 px-4 py-2 rounded-xl hover:bg-[#C6A15B]/20 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Semester
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ManagePersonalTrackerModal;
