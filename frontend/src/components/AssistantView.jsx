import { useState, useEffect, useRef } from 'react'
import { getChatHistory, askChat } from '../api'
import { 
  AssistantIcon, RefreshIcon, LightbulbIcon, 
  DocumentIcon, SendIcon, CrossIcon, ChevronRightIcon 
} from './Icons'

const AssistantView = ({ projectId = 1 }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedSources, setSelectedSources] = useState(null)
  const messagesEndRef = useRef(null)

  const starterPrompts = [
    "What are the critical risks facing this project?",
    "Summarize the project deliverables and milestones.",
    "Are there any active blockers delaying delivery?",
    "Explain the system requirements and technical goals."
  ]

  const fetchHistory = async () => {
    try {
      const res = await getChatHistory(projectId)
      setMessages(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (questionText) => {
    const query = questionText || input
    if (!query.trim() || loading) return

    setInput('')
    setLoading(true)

    // Optimistic user question display
    const tempMsg = {
      id: 'temp-' + Date.now(),
      question: query,
      answer: '',
      sources: [],
      isOptimistic: true
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await askChat(projectId, query)
      setMessages(prev => prev.filter(m => !m.isOptimistic).concat(res.data))
    } catch (err) {
      console.error(err)
      setMessages(prev => prev.filter(m => !m.isOptimistic).concat({
        id: 'err-' + Date.now(),
        question: query,
        answer: 'Failed to retrieve response from AI Advisor. Please verify backend connection.',
        sources: []
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
            <AssistantIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              AI Project Intelligence Assistant
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-semibold border border-indigo-500/30">
                Grounded RAG
              </span>
            </h2>
            <p className="text-xs text-gray-400">Trained on project SRS, architecture, and sprint telemetry</p>
          </div>
        </div>

        <button 
          onClick={fetchHistory}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12 max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <LightbulbIcon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Ask anything about your project</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask about scope details, risk mitigations, assigned blockers, or timeline predictions. Responses cite grounded document excerpts.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-2 text-left">
              {starterPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="bg-gray-950 hover:bg-gray-800/80 border border-gray-800 rounded-xl p-3 text-xs text-gray-300 hover:text-white transition-all text-left flex items-center justify-between group"
                >
                  <span>{p}</span>
                  <ChevronRightIcon className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-4">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-xl text-sm shadow-lg shadow-indigo-600/20">
                {msg.question}
              </div>
            </div>

            {/* AI Answer */}
            {msg.answer && (
              <div className="flex gap-3 justify-start max-w-2xl">
                <div className="w-8 h-8 rounded-lg bg-gray-800 text-indigo-400 flex items-center justify-center shrink-0 border border-gray-700">
                  <AssistantIcon className="w-4 h-4" />
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-950 border border-gray-800 rounded-2xl rounded-tl-sm p-5 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {msg.answer}
                  </div>

                  {/* Sources citation buttons */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="text-gray-500 text-[11px] font-semibold uppercase">Sources:</span>
                      {msg.sources.map((src, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => setSelectedSources(src)}
                          className="bg-gray-800/80 hover:bg-gray-700 border border-gray-700/60 text-indigo-300 px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1.5"
                        >
                          <DocumentIcon className="w-3 h-3 text-indigo-400" />
                          <span className="truncate max-w-[140px]">{src.document_name || 'Document'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start max-w-xl">
            <div className="w-8 h-8 rounded-lg bg-gray-800 text-indigo-400 flex items-center justify-center shrink-0 border border-gray-700">
              <AssistantIcon className="w-4 h-4" />
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-2xl rounded-tl-sm p-4 text-xs text-indigo-400 flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
              Consulting project vectors & synthesizing answer...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-gray-950 border-t border-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about project architecture, risks, or timeline..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center gap-2"
          >
            <span>Send</span>
            <SendIcon className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* Source Citation Modal / Drawer */}
      {selectedSources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <DocumentIcon className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-white text-sm truncate max-w-[260px]">
                  {selectedSources.document_name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedSources(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <CrossIcon className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mb-2">Source Chunk Reference: {selectedSources.chunk_id}</p>
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {selectedSources.snippet}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedSources(null)}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssistantView
