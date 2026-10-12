import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

export const getProjects = () => api.get('/projects/')
export const getProject = (id) => api.get(`/projects/${id}/`)

export const getHealthScore = (projectId) => 
  api.get(`/intelligence/health/?project_id=${projectId}`)

export const getScopeItems = (projectId) => 
  api.get(`/intelligence/scope/?project_id=${projectId}`)

export const getDeliverables = (projectId) => 
  api.get(`/intelligence/deliverables/?project_id=${projectId}`)

export const getRisks = (projectId) => 
  api.get(`/intelligence/risks/?project_id=${projectId}`)

export const updateRisk = (id, data) => 
  api.patch(`/intelligence/risks/${id}/`, data)

export const getBlockers = (projectId) => 
  api.get(`/intelligence/blockers/?project_id=${projectId}`)

export const updateBlocker = (id, data) => 
  api.patch(`/intelligence/blockers/${id}/`, data)

export const getActionItems = (projectId) => 
  api.get(`/intelligence/actions/?project_id=${projectId}`)

export const updateActionItem = (id, data) => 
  api.patch(`/intelligence/actions/${id}/`, data)

export const getForecast = (projectId) => 
  api.get(`/intelligence/forecast/?project_id=${projectId}`)

export const getDocuments = (projectId) => 
  api.get(`/documents/?project_id=${projectId}`)

export const uploadDocument = (formData) => 
  api.post('/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const processDocument = (docId) => 
  api.post(`/documents/${docId}/process/`)

export const runAgents = (projectId) => 
  api.post('/intelligence/run-agents/', { project_id: projectId })

export const generateReport = (projectId, reportType) => 
  api.post('/intelligence/generate-report/', { 
    project_id: projectId, 
    report_type: reportType 
  })

export const getChatHistory = (projectId) => 
  api.get(`/intelligence/chat/?project_id=${projectId}`)

export const askChat = (projectId, question) => 
  api.post('/intelligence/chat/', { 
    project_id: projectId, 
    question 
  })

export default api
