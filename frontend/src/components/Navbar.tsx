import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, FolderKanban, LogOut, User as UserIcon } from 'lucide-react';
import api from '../services/api';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUserEmail(res.data.email);
      } catch {
        // Ignored if unauthenticated
      }
    };
    if (localStorage.getItem('token')) {
      fetchUser();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <header className="bg-surface/80 backdrop-blur-md border-b border-gray-700/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/projects" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <ShieldAlert size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              Project Intelligence
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                Risk Advisor
              </span>
            </div>
            <p className="text-xs text-textMuted">Document Pipeline & Risk Engine</p>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/projects"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname.startsWith('/projects')
                ? 'bg-gray-800 text-white'
                : 'text-textMuted hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <FolderKanban size={16} />
            Projects
          </Link>

          {userEmail && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 text-xs text-textMuted border border-gray-700">
              <UserIcon size={14} className="text-primary" />
              <span>{userEmail}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-textMuted hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 transition-all"
            title="Log Out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
