import { useState } from 'react'
import { uploadDocument } from '../api'
import { UploadIcon, DocumentIcon, CheckIcon, CrossIcon } from './Icons'

const UploadModal = ({ isOpen, onClose, projectId, onUploadSuccess }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
      setSuccessMsg('')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('project', projectId || 1)
      formData.append('file_path', file)
      formData.append('name', file.name)
      const ext = file.name.split('.').pop()
      formData.append('file_type', (ext || 'PDF').toUpperCase())
      formData.append('file_size', file.size || 0)
      
      const res = await uploadDocument(formData)
      setSuccessMsg('Document uploaded and ingested successfully!')
      setFile(null)
      if (onUploadSuccess) onUploadSuccess(res.data)
      setTimeout(() => {
        onClose()
        setSuccessMsg('')
      }, 1500)
    } catch (err) {
      console.error('Upload failed:', err)
      const errorDetail = err.response?.data 
        ? (typeof err.response.data === 'string' 
            ? err.response.data 
            : Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join(', '))
        : err.message
      setError(errorDetail || 'Failed to upload document. Please check server.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UploadIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Ingest Project Artifact</h3>
              <p className="text-xs text-gray-400">PDF, DOCX, CSV, or TXT documents</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <CrossIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all bg-gray-950/40">
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".pdf,.docx,.csv,.txt"
              onChange={handleFileChange} 
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <DocumentIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-indigo-400 hover:underline">
                {file ? file.name : "Click to browse or drag file here"}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Max file size: 50MB"}
              </p>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Processing & Indexing...
                </>
              ) : (
                'Upload & Extract'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadModal
