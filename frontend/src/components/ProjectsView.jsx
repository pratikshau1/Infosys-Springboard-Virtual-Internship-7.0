import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject, updateProject, deleteProject, getCurrentUser } from '../api'
import { 
  DashboardIcon, SearchIcon, DocumentIcon, 
  RiskIcon, BlockerIcon, HealthIcon, RefreshIcon, 
  ChevronRightIcon, MoreIcon, EditIcon, TrashIcon, UsersIcon 
} from './Icons'
import ProjectModal from './ProjectModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import ProjectMembersModal from './ProjectMembersModal'

const ProjectsView = ({ onSelectProject }) => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('updated_at') // 'updated_at' | 'name'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deletingProject, setDeletingProject] = useState(null)
  const [managingMembersProject, setManagingMembersProject] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null) // { type: 'success' | 'error', text: '' }

  const fetchProjectsData = async () => {
    try {
      setLoading(true)
      const [projRes, userRes] = await Promise.all([
        getProjects(),
        getCurrentUser().catch(() => ({ data: null }))
      ])
      setProjects(projRes.data || [])
      if (userRes.data) setCurrentUser(userRes.data)
    } catch (err) {
      console.error('Failed to load projects list:', err)
      showFeedback('error', 'Unable to retrieve projects portfolio.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectsData()
  }, [])

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => {
      setFeedbackMsg(null)
    }, 4500)
  }

  // Handle Project Creation
  const handleCreateSubmit = async (formData) => {
    const res = await createProject(formData)
    await fetchProjectsData()
    showFeedback('success', `Project "${res.data.name}" created successfully.`)
    if (onSelectProject) {
      onSelectProject(res.data.id)
    }
  }

  // Handle Project Edit
  const handleEditSubmit = async (formData) => {
    if (!editingProject) return
    const res = await updateProject(editingProject.id, formData)
    await fetchProjectsData()
    showFeedback('success', `Project "${res.data.name}" updated successfully.`)
    setEditingProject(null)
  }

  // Handle Project Deletion
  const handleDeleteConfirm = async (projectId) => {
    setDeleteLoading(true)
    try {
      const res = await deleteProject(projectId)
      // Remove from list after backend confirmation
      setProjects(prev => prev.filter(p => p.id !== projectId))
      showFeedback('success', res.data?.message || 'Project deleted successfully.')
      setDeletingProject(null)
    } catch (err) {
      const errDetail = err.response?.data?.error || 'Failed to delete project. Please check permissions.'
      showFeedback('error', errDetail)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filter and sort client-side
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'All' || p.status?.toLowerCase() === statusFilter.toLowerCase()
    const matchesCategory = categoryFilter === 'All' || p.category?.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesCategory
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    }
    return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
  })

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(projects.map(p => p.category).filter(Boolean)))]
  const statuses = ['All', 'In Progress', 'Active', 'Planning', 'On Hold', 'Completed']

  const handleOpenProject = (projectId) => {
    if (onSelectProject) {
      onSelectProject(projectId)
    }
    navigate('/app')
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-200' 
            : 'bg-red-950/90 border-red-700/60 text-red-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${feedbackMsg.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header with ProjectIQ Palette & + New Project Button */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DB9558]"></span>
            <span className="text-xs uppercase tracking-wider font-bold text-[#DB9558]">
              Project Portfolio Repository
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Projects Portfolio
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Centralized intelligence cockpit supervising enterprise initiatives, document indexing, risk exposure, and delivery health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjectsData}
            title="Refresh Projects"
            className="px-3.5 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <RefreshIcon className="w-4 h-4 text-[#97A87A]" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 bg-[#DB9558] hover:bg-[#c68246] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#DB9558]/25 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Filter and Control Bar */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#DB9558] transition-colors"
          />
        </div>

        {/* Filters and View toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#DB9558]"
            >
              {statuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#DB9558]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-gray-400 uppercase">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#DB9558]"
            >
              <option value="updated_at">Recently Updated</option>
              <option value="name">Project Name</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-950 border border-gray-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-[#DB9558] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                viewMode === 'list' ? 'bg-[#DB9558] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-2 border-[#DB9558] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 font-medium">Loading project intelligence records...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DB9558]/10 border border-[#DB9558]/30 flex items-center justify-center mx-auto text-[#DB9558]">
            <DashboardIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Welcome to ProjectIQ</h2>
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            Create your first project to organize documents, track deliverables, identify risks, and monitor project health.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-6 py-3 bg-[#DB9558] hover:bg-[#c68246] text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#DB9558]/30 transition-all active:scale-95"
          >
            + Create Your First Project
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <DashboardIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Matching Projects</h3>
          <p className="text-xs text-gray-400 mb-4">
            No projects matched your active search or filter criteria.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('All'); setCategoryFilter('All'); }}
            className="px-4 py-2 bg-[#DB9558] hover:bg-[#c68246] text-white rounded-xl text-xs font-semibold transition-all"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <ProjectCard 
              key={p.id} 
              project={p} 
              onOpen={() => handleOpenProject(p.id)}
              onEdit={() => setEditingProject(p)}
              onDelete={() => setDeletingProject(p)}
              onManageMembers={() => setManagingMembersProject(p)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Progress</th>
                <th className="py-3 px-3">Health</th>
                <th className="py-3 px-3">Docs / Risks / Blockers</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredProjects.map((p) => (
                <ProjectTableRow 
                  key={p.id} 
                  project={p} 
                  onOpen={() => handleOpenProject(p.id)}
                  onEdit={() => setEditingProject(p)}
                  onDelete={() => setDeletingProject(p)}
                  onManageMembers={() => setManagingMembersProject(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal */}
      <ProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        title="Create New Project"
        submitLabel="Create Project"
      />

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectModal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          onSubmit={handleEditSubmit}
          initialData={editingProject}
          title={`Edit Project: ${editingProject.name}`}
          submitLabel="Save Changes"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeletingProject(null)}
          onConfirm={handleDeleteConfirm}
          project={deletingProject}
          loading={deleteLoading}
        />
      )}

      {/* Project Members & RBAC Modal */}
      {managingMembersProject && (
        <ProjectMembersModal
          isOpen={true}
          onClose={() => setManagingMembersProject(null)}
          project={managingMembersProject}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

function ProjectCard({ project, onOpen, onEdit, onDelete, onManageMembers }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const healthScore = project.health_score
  const progress = project.progress_percentage ?? 0
  const updatedDate = project.updated_at 
    ? new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently'
  const startDate = project.start_date || 'TBD'
  const targetDate = project.target_date || 'TBD'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl hover:border-[#DB9558]/50 transition-all flex flex-col justify-between group relative">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#DB9558] via-[#97A87A] to-[#A8BBA3]"></div>

      <div>
        {/* Top Badges & Context Menu Button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-[#DB9558] bg-[#DB9558]/10 border border-[#DB9558]/20 px-2.5 py-0.5 rounded-full">
            {project.category || 'General'}
          </span>
          
          <div className="flex items-center gap-1.5 relative">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              project.priority?.toLowerCase() === 'critical'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : project.priority?.toLowerCase() === 'high' 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {project.priority || 'Medium'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {project.status || 'In Progress'}
            </span>

            {/* Three-dot context menu */}
            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Project Options"
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <MoreIcon className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 top-7 w-40 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl p-1 z-30 space-y-0.5">
                    <button
                      onClick={() => { setMenuOpen(false); onOpen(); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-gray-900 flex items-center gap-2"
                    >
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[#DB9558]" />
                      <span>Open Project</span>
                    </button>

                    <button
                      onClick={() => { setMenuOpen(false); onManageMembers(); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:text-indigo-300 hover:bg-gray-900 flex items-center gap-2"
                    >
                      <UsersIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Team & Access</span>
                    </button>
                    
                    {project.can_edit !== false && (
                      <button
                        onClick={() => { setMenuOpen(false); onEdit(); }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-gray-900 flex items-center gap-2"
                      >
                        <EditIcon className="w-3.5 h-3.5 text-[#97A87A]" />
                        <span>Edit Project</span>
                      </button>
                    )}

                    {project.can_delete !== false && (
                      <button
                        onClick={() => { setMenuOpen(false); onDelete(); }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 flex items-center gap-2"
                      >
                        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
                        <span>Delete Project</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Project Title */}
        <h3 
          onClick={onOpen}
          className="text-lg font-bold text-white group-hover:text-[#DB9558] transition-colors leading-snug cursor-pointer"
        >
          {project.name}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
          {project.description || 'AI-monitored project initiative with automated document analysis and risk forecasting.'}
        </p>

        {/* Manager & Timeline */}
        <div className="mt-4 pt-3 border-t border-gray-800/80 space-y-1.5 text-xs text-gray-300">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-500">Project Manager:</span>
            <span className="font-semibold text-gray-200">{project.project_manager || 'Unassigned'}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-500">Timeline:</span>
            <span className="text-gray-300">{startDate} &rarr; {targetDate}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400 font-medium">Deliverables Progress</span>
            <span className="font-bold text-[#DB9558]">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#DB9558] to-[#97A87A] transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Metric Counts Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-800/80 text-center">
          <div className="bg-gray-950 p-2 rounded-xl border border-gray-800/60">
            <span className="text-[10px] text-gray-500 block">Docs</span>
            <span className="text-xs font-bold text-gray-200">{project.documents_count ?? 0}</span>
          </div>
          <div className="bg-gray-950 p-2 rounded-xl border border-gray-800/60">
            <span className="text-[10px] text-gray-500 block">Risks</span>
            <span className="text-xs font-bold text-red-400">{project.open_risks_count ?? 0}</span>
          </div>
          <div className="bg-gray-950 p-2 rounded-xl border border-gray-800/60">
            <span className="text-[10px] text-gray-500 block">Blockers</span>
            <span className="text-xs font-bold text-orange-400">{project.open_blockers_count ?? 0}</span>
          </div>
          <div className="bg-gray-950 p-2 rounded-xl border border-gray-800/60">
            <span className="text-[10px] text-gray-500 block">Health</span>
            {healthScore !== null && healthScore !== undefined ? (
              <span className={`text-xs font-bold ${
                healthScore >= 75 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {healthScore}/100
              </span>
            ) : (
              <span className="text-[9px] text-gray-500 font-medium block">Not analyzed</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="mt-5 pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
        <span className="text-[10px] text-gray-500 truncate">
          Updated {updatedDate}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onManageMembers}
            title="Manage Team & Permissions"
            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <UsersIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Team</span>
          </button>
          <button
            onClick={onOpen}
            className="px-3.5 py-1.5 bg-[#DB9558] hover:bg-[#c68246] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#DB9558]/20"
          >
            <span>Open</span>
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectTableRow({ project, onOpen, onEdit, onDelete, onManageMembers }) {
  const healthScore = project.health_score
  const progress = project.progress_percentage ?? 0

  return (
    <tr className="hover:bg-gray-800/40 transition-colors">
      <td className="py-3 px-4">
        <p className="font-bold text-white hover:text-[#DB9558] cursor-pointer" onClick={onOpen}>
          {project.name}
        </p>
        <p className="text-[11px] text-gray-500 truncate max-w-xs">{project.description}</p>
      </td>
      <td className="py-3 px-3 text-gray-300">{project.category || 'General'}</td>
      <td className="py-3 px-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {project.status}
        </span>
      </td>
      <td className="py-3 px-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-400 border border-red-500/20">
          {project.priority}
        </span>
      </td>
      <td className="py-3 px-3 font-semibold text-[#DB9558]">{progress}%</td>
      <td className="py-3 px-3">
        {healthScore !== null && healthScore !== undefined ? (
          <span className={`font-bold ${healthScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {healthScore}/100
          </span>
        ) : (
          <span className="text-gray-500 text-[10px]">Not analyzed</span>
        )}
      </td>
      <td className="py-3 px-3 text-gray-400">
        <span className="text-gray-300 font-semibold">{project.documents_count ?? 0}</span> docs &bull;{' '}
        <span className="text-red-400 font-semibold">{project.open_risks_count ?? 0}</span> risks &bull;{' '}
        <span className="text-orange-400 font-semibold">{project.open_blockers_count ?? 0}</span> blockers
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onOpen}
            className="px-2.5 py-1 bg-[#DB9558] hover:bg-[#c68246] text-white rounded-lg text-xs font-semibold transition-all"
          >
            Open
          </button>
          <button
            onClick={onManageMembers}
            title="Team & Access"
            className="p-1 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <UsersIcon className="w-4 h-4 text-indigo-400" />
          </button>
          {project.can_edit !== false && (
            <button
              onClick={onEdit}
              title="Edit Project"
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <EditIcon className="w-4 h-4 text-[#97A87A]" />
            </button>
          )}
          {project.can_delete !== false && (
            <button
              onClick={onDelete}
              title="Delete Project"
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default ProjectsView
