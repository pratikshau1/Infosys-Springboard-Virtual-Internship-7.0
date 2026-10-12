import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  DashboardIcon, DocumentIcon, ScopeIcon, 
  RiskIcon, BlockerIcon, AssistantIcon, CrossIcon, CheckIcon
} from './Icons'
import { getProjects, createProject } from '../api'

const Sidebar = ({ currentProjectId, onSelectProject }) => {
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [loading, setLoading] = useState(false)

  const loadProjects = async () => {
    try {
      const res = await getProjects()
      setProjects(res.data || [])
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setLoading(true)
    try {
      const res = await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        status: 'Active'
      })
      await loadProjects()
      if (onSelectProject) onSelectProject(res.data.id)
      setIsModalOpen(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (err) {
      console.error('Error creating project:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const navItems = [
    { name: 'Dashboard', path: '/app', icon: DashboardIcon },
    { name: 'Documents', path: '/app/documents', icon: DocumentIcon },
    { name: 'Scope', path: '/app/scope', icon: ScopeIcon },
    { name: 'Risks', path: '/app/risks', icon: RiskIcon },
    { name: 'Blockers', path: '/app/blockers', icon: BlockerIcon },
    { name: 'AI Assistant', path: '/app/assistant', icon: AssistantIcon },
  ]

  return (
    <>
      <aside className="w-64 bg-gray-950/80 backdrop-blur-xl border-r border-gray-800 flex flex-col transition-all duration-300 relative z-20">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            AI Project Advisor
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
        
        <nav className="flex-1 px-4 space-y-1.5 mt-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 transition-colors" />
                <span className="font-medium text-xs">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-[1.5px]">
              <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-xs font-bold text-white">
                PR
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-white">Pratiksha</p>
              <p className="text-[10px] text-gray-500">Project Lead</p>
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Create New Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <CrossIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Campus Transit"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Brief overview of project scope and objectives..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newProjectName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
