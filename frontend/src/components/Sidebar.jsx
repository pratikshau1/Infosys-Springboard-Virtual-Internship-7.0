import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getProjects, createProject, getCurrentUser } from '../api'
import { 
  DashboardIcon, DocumentIcon, ScopeIcon, 
  RiskIcon, BlockerIcon, AssistantIcon, CrossIcon, CheckIcon, UsersIcon, SettingsIcon
} from './Icons'
import ProjectModal from './ProjectModal'



const Sidebar = ({ currentProjectId, onSelectProject }) => {
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [currentUser, setCurrentUser] = useState(null)

  const loadProjects = async () => {
    try {
      const res = await getProjects()
      setProjects(res.data || [])
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  const loadUser = async () => {
    try {
      const res = await getCurrentUser()
      setCurrentUser(res.data)
    } catch (err) {
      // Unauthenticated or guest
    }
  }

  useEffect(() => {
    loadProjects()
    loadUser()
  }, [])

  const handleCreateProject = async (formData) => {
    const res = await createProject(formData)
    await loadProjects()
    if (onSelectProject) onSelectProject(res.data.id)
    setIsModalOpen(false)
  }
  
  const navItems = [
    { name: 'Projects', path: '/app/projects', icon: DashboardIcon },
    { name: 'Dashboard', path: '/app', icon: DashboardIcon },
    { name: 'Documents', path: '/app/documents', icon: DocumentIcon },
    { name: 'Scope', path: '/app/scope', icon: ScopeIcon },
    { name: 'Risks', path: '/app/risks', icon: RiskIcon },
    { name: 'Blockers', path: '/app/blockers', icon: BlockerIcon },
    { name: 'AI Assistant', path: '/app/assistant', icon: AssistantIcon },
  ]

  // Add Admin item if staff or superuser
  if (currentUser?.is_staff || currentUser?.is_superuser) {
    navItems.push({ name: 'Platform Users', path: '/app/users', icon: UsersIcon })
  }

  return (
    <>
      <aside className="w-64 bg-gray-950/80 backdrop-blur-xl border-r border-gray-800 flex flex-col transition-all duration-300 relative z-20">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            ProjectIQ
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Intelligence Layer</p>

          {/* Project Switcher Select */}
          <div className="mt-4 pt-4 border-t border-gray-800/80">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
              Active Project
            </label>
            <div className="flex gap-2">
              <select
                value={currentProjectId || 1}
                onChange={(e) => onSelectProject && onSelectProject(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsModalOpen(true)}
                title="Create Project"
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600/10 text-[#DB9558] shadow-[inset_0_0_20px_rgba(219,149,88,0.1)] font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#DB9558]' : ''}`} />
                <span className="font-medium text-xs">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Subtle Divider and Settings Link */}
        <div className="px-4 py-2 border-t border-gray-800/80">
          <Link
            to="/app/settings"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
              location.pathname.startsWith('/app/settings')
                ? 'bg-[#DB9558]/10 text-[#DB9558] shadow-[inset_0_0_20px_rgba(219,149,88,0.15)] font-bold border border-[#DB9558]/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <SettingsIcon className={`w-4 h-4 shrink-0 transition-colors ${location.pathname.startsWith('/app/settings') ? 'text-[#DB9558]' : ''}`} />
            <span className="font-medium text-xs">Settings</span>
          </Link>
        </div>

        <div className="p-4 border-t border-gray-800/50 flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-[1.5px]">
              <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase">
                {currentUser?.username ? currentUser.username.substring(0, 2) : 'IQ'}
              </div>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">
                {currentUser?.first_name || currentUser?.username || 'Team Lead'}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {currentUser?.is_superuser ? 'Superuser' : currentUser?.is_staff ? 'Administrator' : 'Project Contributor'}
              </p>
            </div>
          </div>

          <Link
            to="/"
            title="Sign Out / Landing"
            className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Exit
          </Link>
        </div>
      </aside>

      {/* New Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
        title="Create New Project"
        submitLabel="Create Project"
      />
    </>
  )
}

export default Sidebar
