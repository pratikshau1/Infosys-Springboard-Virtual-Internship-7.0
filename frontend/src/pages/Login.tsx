import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, LogIn, Activity, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.access_token);
      navigate('/projects');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="card w-full max-w-md border-gray-700/80 bg-surface/90 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 mb-3">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Project Intelligence</h2>
          <p className="text-xs text-textMuted mt-0.5">Sign in to your advisor workspace</p>
        </div>

        {error && (
          <div className="bg-error/15 text-error border border-error/30 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-textMuted text-xs font-semibold uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@company.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-textMuted text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="input-field pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2 !py-2.5 mt-2"
          >
            {submitting ? (
              <>
                <Activity size={18} className="animate-spin" /> Signing In...
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-textMuted border-t border-gray-800 pt-4">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-primary hover:underline font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
