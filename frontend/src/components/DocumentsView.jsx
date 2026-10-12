import { useState, useEffect } from 'react'
import { getDocuments, processDocument } from '../api'
import { DocumentIcon, UploadIcon, FolderIcon, RefreshIcon } from './Icons'
import UploadModal from './UploadModal'

const DocumentsView = ({ projectId = 1 }) => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await getDocuments(projectId)
      setDocuments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [projectId])

  const handleReprocess = async (docId) => {
    try {
      setProcessingId(docId)
      await processDocument(docId)
      await fetchDocs()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessingId(null)
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Project Documents</h2>
          <p className="text-gray-400 text-sm">Ingested artifacts processed by the Vector RAG Pipeline</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center gap-2 self-start sm:self-auto"
        >
          <UploadIcon className="w-4 h-4 text-white" />
          <span>Upload Artifact</span>
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center">
          <FolderIcon className="w-12 h-12 text-indigo-400/80 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No documents ingested yet</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Upload project proposals, SRS specifications, meeting minutes, or risk logs to extract intelligence.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2"
          >
            <UploadIcon className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const isProcessing = processingId === doc.id || doc.status === 'Processing'
            const isProcessed = doc.status === 'Processed'
            return (
              <div 
                key={doc.id}
                className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 shadow-xl hover:border-gray-700 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                      <DocumentIcon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isProcessed 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : doc.status === 'Failed' 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-white text-base mb-1 truncate group-hover:text-indigo-400 transition-colors" title={doc.name}>
                    {doc.name}
                  </h3>
                  
                  <div className="text-xs text-gray-400 space-y-1 mt-3">
                    <p className="flex justify-between">
                      <span>Format:</span>
                      <span className="text-gray-300 font-medium">{doc.file_type?.toUpperCase()}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Size:</span>
                      <span className="text-gray-300 font-medium">{formatBytes(doc.file_size)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Index Chunks:</span>
                      <span className="text-indigo-300 font-medium">{doc.num_pages_rows || 'N/A'} chunks</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Uploaded:</span>
                      <span className="text-gray-300">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between">
                  <span className="text-xs text-gray-500">ID #{doc.id}</span>
                  <button
                    onClick={() => handleReprocess(doc.id)}
                    disabled={isProcessing}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50 flex items-center gap-1.5 hover:underline"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                        Re-indexing...
                      </>
                    ) : (
                      <>
                        <RefreshIcon className="w-3.5 h-3.5" />
                        <span>Re-index Vectors</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projectId={projectId}
        onUploadSuccess={() => fetchDocs()}
      />
    </div>
  )
}

export default DocumentsView
