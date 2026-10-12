import { useState, useEffect } from 'react'
import { getRisks, updateRisk } from '../api'
import { ShieldIcon, CheckIcon } from './Icons'

const RisksView = ({ projectId = 1 }) => {
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState('All')

  const fetchRisks = async () => {
    try {
      setLoading(true)
      const res = await getRisks(projectId)
      setRisks(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRisks()
  }, [projectId])

  const handleToggleStatus = async (risk) => {
    const nextStatus = risk.status === 'Active' ? 'Mitigated' : 'Active'
    try {
      await updateRisk(risk.id, { status: nextStatus })
      setRisks(risks.map(r => r.id === risk.id ? { ...r, status: nextStatus } : r))
    } catch (err) {
      console.error(err)
    }
  }

  const filteredRisks = risks.filter(r => {
    if (filterSeverity === 'All') return true
    return r.severity?.toLowerCase() === filterSeverity.toLowerCase()
  })

  const criticalCount = risks.filter(r => r.severity?.toLowerCase() === 'critical').length
  const moderateCount = risks.filter(r => r.severity?.toLowerCase() === 'moderate').length
  const lowCount = risks.filter(r => r.severity?.toLowerCase() === 'low').length

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Risk Management Matrix</h2>
          <p className="text-gray-400 text-sm">Automated severity scoring, exposure analysis, and mitigation plans</p>
        </div>

        {/* Severity Summary Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterSeverity('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterSeverity === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            All ({risks.length})
          </button>
          <button
            onClick={() => setFilterSeverity('Critical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterSeverity === 'Critical' ? 'bg-red-600 text-white' : 'bg-gray-900 text-red-400 hover:bg-red-950/40'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilterSeverity('Moderate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterSeverity === 'Moderate' ? 'bg-amber-600 text-white' : 'bg-gray-900 text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            Moderate ({moderateCount})
          </button>
          <button
            onClick={() => setFilterSeverity('Low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterSeverity === 'Low' ? 'bg-emerald-600 text-white' : 'bg-gray-900 text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            Low ({lowCount})
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRisks.map(risk => {
            const isCrit = risk.severity?.toLowerCase() === 'critical'
            const isMod = risk.severity?.toLowerCase() === 'moderate'
            const isMitigated = risk.status === 'Mitigated'

            return (
              <div
                key={risk.id}
                className={`bg-gray-900 border rounded-3xl p-6 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between ${
                  isMitigated 
                    ? 'border-gray-800 opacity-70' 
                    : isCrit 
                    ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : isMod 
                    ? 'border-amber-500/30' 
                    : 'border-gray-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isCrit 
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                          : isMod 
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {risk.severity} Severity
                      </span>
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800/60 rounded-md">
                        {risk.category}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(risk)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        isMitigated 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isMitigated ? 'Mitigated' : 'Mark Mitigated'}
                    </button>
                  </div>

                  <h3 className={`text-lg font-bold mb-2 ${isMitigated ? 'line-through text-gray-400' : 'text-white'}`}>
                    {risk.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    {risk.description}
                  </p>

                  {/* Impact & Probability Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/60">
                      <span className="text-xs text-gray-500 block">Probability</span>
                      <span className="text-sm font-semibold text-gray-300">{risk.probability}</span>
                    </div>
                    <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-800/60">
                      <span className="text-xs text-gray-500 block">Impact</span>
                      <span className="text-sm font-semibold text-gray-300">{risk.impact}</span>
                    </div>
                  </div>

                  {/* Mitigation Plan Box */}
                  <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-4">
                    <span className="text-xs font-semibold text-indigo-400 block mb-1 flex items-center gap-1.5">
                      <ShieldIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AI Recommended Mitigation</span>
                    </span>
                    <p className="text-xs text-indigo-200/90 leading-relaxed">
                      {risk.mitigation || "Review architecture with project lead and add automated failover tests."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-800/80 flex justify-between text-xs text-gray-500">
                  <span>Status: <strong className={isMitigated ? 'text-emerald-400' : 'text-amber-400'}>{risk.status}</strong></span>
                  <span>Risk ID #{risk.id}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RisksView
