import { useState, useEffect } from 'react'
import { getBlockers, updateBlocker, getActionItems, updateActionItem } from '../api'
import { CheckIcon, TaskIcon } from './Icons'

const BlockersView = ({ projectId = 1 }) => {
  const [blockers, setBlockers] = useState([])
  const [actions, setActions] = useState([])
  const [activeTab, setActiveTab] = useState('blockers')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [blockRes, actRes] = await Promise.all([
        getBlockers(projectId),
        getActionItems(projectId)
      ])
      setBlockers(blockRes.data)
      setActions(actRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleToggleBlocker = async (blocker) => {
    const nextStatus = blocker.status === 'Active' ? 'Resolved' : 'Active'
    try {
      await updateBlocker(blocker.id, { status: nextStatus })
      setBlockers(blockers.map(b => b.id === blocker.id ? { ...b, status: nextStatus } : b))
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleAction = async (action) => {
    const nextStatus = action.status === 'Completed' ? 'Pending' : 'Completed'
    try {
      await updateActionItem(action.id, { status: nextStatus })
      setActions(actions.map(a => a.id === action.id ? { ...a, status: nextStatus } : a))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Blockers & Action Items</h2>
          <p className="text-gray-400 text-sm">Critical path impediments and automated task extraction</p>
        </div>

        <div className="flex gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
          <button
            onClick={() => setActiveTab('blockers')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'blockers' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Active Blockers ({blockers.filter(b => b.status === 'Active').length})
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'actions' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sprint Actions ({actions.length})
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'blockers' ? (
        /* Blockers List */
        <div className="space-y-4">
          {blockers.map(blocker => {
            const isResolved = blocker.status === 'Resolved'
            const isHigh = blocker.priority?.toLowerCase() === 'high'

            return (
              <div
                key={blocker.id}
                className={`bg-gray-900 border rounded-3xl p-6 shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isResolved ? 'border-gray-800 opacity-60' : isHigh ? 'border-orange-500/30' : 'border-gray-800'
                }`}
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isHigh ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {blocker.priority} Priority
                    </span>
                    <span className="text-xs text-gray-500">Owner: <strong className="text-gray-300">{blocker.owner || 'Unassigned'}</strong></span>
                  </div>

                  <h3 className={`text-lg font-bold ${isResolved ? 'line-through text-gray-400' : 'text-white'}`}>
                    {blocker.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {blocker.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <button
                    onClick={() => handleToggleBlocker(blocker)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isResolved 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95'
                    }`}
                  >
                    {isResolved ? 'Resolved' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Action Items Table / Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map(action => {
            const isCompleted = action.status === 'Completed'
            return (
              <div
                key={action.id}
                className={`bg-gray-900 border rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between ${
                  isCompleted ? 'border-gray-800 opacity-60' : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700/60 flex items-center justify-center">
                      {isCompleted ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <TaskIcon className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                      action.priority?.toLowerCase() === 'high' 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {action.priority}
                    </span>
                  </div>
                  <h4 className={`text-base font-bold mb-2 ${isCompleted ? 'line-through text-gray-400' : 'text-white'}`}>
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-400 mb-4">{action.description || 'Sprint task derived by AI extraction agent.'}</p>
                </div>

                <div className="pt-4 border-t border-gray-800 space-y-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Assignee:</span>
                    <span className="text-indigo-300 font-medium">{action.owner || 'Dev Team'}</span>
                  </div>
                  {action.due_date && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Due Date:</span>
                      <span className="text-gray-300">{action.due_date}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleToggleAction(action)}
                    className="w-full mt-2 py-1.5 rounded-xl text-xs font-medium bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 transition-colors"
                  >
                    {isCompleted ? 'Reopen Task' : 'Complete Action'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BlockersView
