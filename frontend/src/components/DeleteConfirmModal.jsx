import { useState } from 'react'
import { TrashIcon, CrossIcon } from './Icons'

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, project, loading }) => {
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !project) return null

  const isImportant = project.is_demo || (project.documents_count && project.documents_count > 5)

  const handleConfirm = () => {
    if (isImportant && confirmName.trim() !== project.name.trim()) {
      setError(`Please type the project name "${project.name}" exactly to confirm deletion.`)
      return
    }
    setError('')
    onConfirm(project.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-red-900/50 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-left">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
              <TrashIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Delete this project?</h3>
              <p className="text-xs text-red-400 font-medium">Permanent deletion of project records</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <CrossIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="space-y-3 py-2 text-xs text-gray-300 leading-relaxed">
          <p>
            This action will permanently delete <span className="font-bold text-white px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">{project.name}</span> and its associated project data. Make sure you no longer need this information before continuing.
          </p>

          <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-[11px] text-red-300 space-y-1">
            <p className="font-semibold text-red-200">The following associated resources will be purged:</p>
            <ul className="list-disc list-inside space-y-0.5 text-red-300/90">
              <li>{project.documents_count ?? 0} uploaded documents and stored files</li>
              <li>ChromaDB vector embedding chunks and index</li>
              <li>Scope items, deliverables, milestones, and user stories</li>
              <li>{project.open_risks_count ?? 0} risks, mitigations, blockers, and actions</li>
              <li>Health scores, AI forecasts, and assistant chat logs</li>
            </ul>
          </div>

          {isImportant && (
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Type <span className="text-white font-mono font-bold select-all">{project.name}</span> to confirm:
              </label>
              <input
                type="text"
                placeholder={project.name}
                value={confirmName}
                onChange={(e) => { setConfirmName(e.target.value); setError(''); }}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-400 font-medium">{error}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || (isImportant && confirmName.trim() !== project.name.trim())}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center gap-2"
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>}
            <span>{loading ? 'Deleting...' : 'Delete Project'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal
