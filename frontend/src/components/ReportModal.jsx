import { useState } from 'react'
import { generateReport } from '../api'
import { ReportIcon, DocumentIcon, CrossIcon, CheckIcon } from './Icons'

const ReportModal = ({ isOpen, onClose, projectId }) => {
  const [reportType, setReportType] = useState('executive_summary')
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    setLoading(true)
    setContent('')
    try {
      const res = await generateReport(projectId || 1, reportType)
      setContent(res.data.markdown || 'Report generated.')
    } catch (err) {
      console.error(err)
      setContent('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ReportIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Documentation Generator</h3>
              <p className="text-xs text-gray-400">Synthesize comprehensive intelligence reports</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
            <CrossIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setReportType('executive_summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  reportType === 'executive_summary' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Executive Summary
              </button>
              <button
                type="button"
                onClick={() => setReportType('risk_report')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  reportType === 'risk_report' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Risk Assessment
              </button>
              <button
                type="button"
                onClick={() => setReportType('srs_summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  reportType === 'srs_summary' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                SRS Gap Analysis
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Synthesizing...
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>

          {content ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Markdown Output</span>
                <button
                  onClick={handleCopy}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <DocumentIcon className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 font-mono text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed">
                {content}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 border border-dashed border-gray-800 rounded-2xl">
              <DocumentIcon className="w-10 h-10 text-indigo-400/60 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-300">Ready to Generate Document</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Select your desired report format and click Generate to extract grounded project insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportModal
