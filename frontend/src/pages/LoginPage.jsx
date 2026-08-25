// =============================================================
// SHIVBAEMPIRE — Premium Login Page
// =============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(form.username.trim(), form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 flex-col justify-between p-12">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Shivba Empire Logo"
            className="w-14 h-14 object-contain rounded-xl shadow-lg border border-amber-500/40 bg-black/40"
          />
          <div>
            <div className="text-white font-bold text-3xl tracking-tight">SHIVBAEMPIRE</div>
            <div className="text-gray-400 text-sm mt-0.5">Shivba Tarun Mitra Mandal</div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="text-white text-4xl font-light leading-tight">
              Mandal Management<br />
              <span className="font-bold">Platform</span>
            </div>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">
              Manage Yatra collections, donor records, expenses, and generate professional receipts — all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {['Donor & Collection Management', 'Professional Receipts & QR Codes', 'Real-time Financial Reports'].map(f => (
              <div key={f} className="flex items-center gap-3 text-gray-300 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="text-gray-600 text-xs">
          © 2026 SHIVBAEMPIRE · Shivba Tarun Mitra Mandal
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Mobile brand */}
        <div className="lg:hidden text-center mb-8 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Shivba Empire Logo"
            className="w-16 h-16 object-contain rounded-xl shadow-lg border border-amber-500/40 bg-black/40 mb-3"
          />
          <div className="text-gray-900 font-bold text-2xl">SHIVBAEMPIRE</div>
          <div className="text-gray-500 text-sm">Shivba Tarun Mitra Mandal</div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="username" className="form-label">Username or Email</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  className="form-input pl-9"
                  placeholder="Enter username"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pl-9 pr-10"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full justify-center mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            SHIVBAEMPIRE · Shivba Tarun Mitra Mandal · Mandal Management Platform
          </p>
        </div>
      </div>
    </div>
  );
}
