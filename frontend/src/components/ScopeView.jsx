import { useState, useEffect } from 'react'
import { getScopeItems, getDeliverables } from '../api'
import { ScopeIcon, PackageIcon } from './Icons'

const ScopeView = ({ projectId = 1 }) => {
  const [scopeItems, setScopeItems] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [scopeRes, delivRes] = await Promise.all([
          getScopeItems(projectId),
          getDeliverables(projectId)
        ])
        setScopeItems(scopeRes.data)
        setDeliverables(delivRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [projectId])

  const filteredScope = scopeItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (activeTab === 'requirements') return item.type?.toLowerCase().includes('requirement')
    if (activeTab === 'goals') return item.type?.toLowerCase().includes('goal') || item.type?.toLowerCase().includes('arch')
    return true
  })

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Project Scope & Deliverables</h2>
          <p className="text-gray-400 text-sm">Extracted functional boundaries, specifications, and delivery milestones</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          All Scope Items ({scopeItems.length})
        </button>
        <button
          onClick={() => setActiveTab('requirements')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'requirements' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Functional Requirements
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'goals' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Architecture & Goals
        </button>
        <button
          onClick={() => setActiveTab('deliverables')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'deliverables' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          Milestones & Deliverables ({deliverables.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'deliverables' ? (
        /* Deliverables Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deliverables.map(deliv => (
            <div key={deliv.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <PackageIcon className="w-4 h-4" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  deliv.status?.toLowerCase() === 'completed' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : deliv.status?.toLowerCase() === 'in progress'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {deliv.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{deliv.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{deliv.description || 'Milestone identified by AI Project Intelligence Orchestrator.'}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-800/80">
                <span>Target Deadline:</span>
                <span className="text-indigo-300 font-semibold">{deliv.deadline || 'Pending schedule'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Scope Items Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScope.map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl hover:border-gray-700 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <ScopeIcon className="w-4 h-4" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {item.type}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-gray-800/80 flex justify-between items-center text-xs text-gray-500">
                <span>Scope Ref #{item.id}</span>
                <span className="text-emerald-400">In Scope</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ScopeView
