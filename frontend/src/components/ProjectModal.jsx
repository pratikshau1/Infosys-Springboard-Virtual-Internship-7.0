import { useState, useEffect } from 'react'
import { CrossIcon } from './Icons'

const ProjectModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null, 
  title = "Create New Project", 
  submitLabel = "Create Project" 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Education Technology',
    priority: 'Medium',
    status: 'Planning',
    start_date: '',
    target_date: '',
    objectives: '',
    tags: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || 'General',
        priority: initialData.priority || 'Medium',
        status: initialData.status || 'Planning',
        start_date: initialData.start_date || '',
        target_date: initialData.target_date || '',
        objectives: initialData.objectives || '',
        tags: initialData.tags || '',
      })
    } else {
      // Default dates: today and 90 days from today
      const today = new Date().toISOString().split('T')[0]
      const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      setFormData({
        name: '',
        description: '',
        category: 'Education Technology',
        priority: 'Medium',
        status: 'Planning',
        start_date: today,
        target_date: future,
        objectives: '',
        tags: '',
      })
    }
    setErrors({})
  }, [isOpen, initialData])

  if (!isOpen) return null

  const validate = () => {
    const errs = {}
    if (!formData.name.trim()) errs.name = "Project Name is required."
    if (!formData.description.trim()) errs.description = "Project Description is required."
    if (!formData.start_date) errs.start_date = "Start Date is required."
    if (!formData.target_date) errs.target_date = "Target Completion Date is required."

    if (formData.start_date && formData.target_date) {
      if (new Date(formData.target_date) < new Date(formData.start_date)) {
        errs.target_date = "Target completion date cannot be earlier than start date."
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (err) {
      const serverErrors = err.response?.data
      if (typeof serverErrors === 'object') {
        const mapped = {}
        for (const [k, v] of Object.entries(serverErrors)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v)
        }
        setErrors(mapped)
      } else {
        setErrors({ non_field: "An unexpected error occurred while saving the project." })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Configure project specifications, timeline, and attributes.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <CrossIcon className="w-5 h-5" />
          </button>
        </div>

        {errors.non_field && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
            {errors.non_field}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Required: Project Name */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Project Name <span className="text-[#DB9558]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Smart Campus Management Platform"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full bg-gray-950 border ${
                errors.name ? 'border-red-500' : 'border-gray-800'
              } rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#DB9558] transition-colors`}
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Required: Project Description */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Project Description <span className="text-[#DB9558]">*</span>
            </label>
            <textarea
              rows="3"
              required
              placeholder="Comprehensive summary of project deliverables, scope boundaries, and core workflows..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full bg-gray-950 border ${
                errors.description ? 'border-red-500' : 'border-gray-800'
              } rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#DB9558] transition-colors`}
            />
            {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>}
          </div>

          {/* Dates: Start Date & Target Completion Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Start Date <span className="text-[#DB9558]">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={`w-full bg-gray-950 border ${
                  errors.start_date ? 'border-red-500' : 'border-gray-800'
                } rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#DB9558] transition-colors`}
              />
              {errors.start_date && <p className="text-[11px] text-red-400 mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Target Completion Date <span className="text-[#DB9558]">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className={`w-full bg-gray-950 border ${
                  errors.target_date ? 'border-red-500' : 'border-gray-800'
                } rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#DB9558] transition-colors`}
              />
              {errors.target_date && <p className="text-[11px] text-red-400 mt-1">{errors.target_date}</p>}
            </div>
          </div>

          {/* Optional: Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DB9558]"
              >
                <option value="Education Technology">Education Technology</option>
                <option value="Healthcare Technology">Healthcare Technology</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Enterprise SaaS">Enterprise SaaS</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DB9558]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DB9558]"
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Optional: Objectives */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Project Objectives <span className="text-gray-500 text-[11px] font-normal">(Optional)</span>
            </label>
            <textarea
              rows="2"
              placeholder="Key strategic milestones, target SLA uptime, or business outcome metrics..."
              value={formData.objectives}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#DB9558] transition-colors"
            />
          </div>

          {/* Optional: Tags */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">
              Project Tags <span className="text-gray-500 text-[11px] font-normal">(Optional, comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. edtech, rfid, attendance, q3-release"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#DB9558] transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#DB9558] hover:bg-[#c68246] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-[#DB9558]/25 transition-all active:scale-95 flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
              <span>{loading ? 'Saving...' : submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectModal
