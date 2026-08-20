import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginUser } from '../services/attendanceApi';
import { storeSession } from '../utils/auth';

const LoginPage = ({ setSession }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'faculty'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await loginUser(formData);
      storeSession({ token: response.token, user: response.user });
      setSession({ token: response.token, user: response.user });
      toast.success(`Welcome ${response.user.name}`);

      const fallback = response.user.role === 'faculty' ? '/faculty' : '/student';
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.18),_transparent_30%),#020617] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">College AMS</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight text-white">
            Full-stack attendance tracking for classrooms, faculty, and students.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Faculty can mark attendance once per subject per day, and students get live attendance analytics with low-attendance alerts.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['JWT Login', 'Role-based faculty and student access'],
              ['Attendance Stats', 'Subject-wise totals and percentage cards'],
              ['Responsive UI', 'Modern Tailwind dashboards for college use']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-lg font-semibold">{title}</p>
                <p className="mt-2 text-sm text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="text-2xl font-semibold">Login</h2>
          <p className="mt-2 text-sm text-slate-300">Use your real faculty or student account credentials.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Role</label>
              <div className="grid grid-cols-2 gap-3">
                {['faculty', 'student'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setFormData({
                        role,
                        email: '',
                        password: ''
                      })
                    }
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold capitalize transition ${
                      formData.role === role ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                className="input"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Password</label>
              <input
                className="input"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Signing in...' : 'Login to Dashboard'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
