import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Attach stored auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const registerUser = (data) => api.post('/projects/auth/register/', data)
export const loginUser = (data) => api.post('/projects/auth/login/', data)
export const getCurrentUser = () => api.get('/projects/auth/me/')

export const getProjects = (params) => api.get('/projects/', { params })
export const getProject = (id) => api.get(`/projects/${id}/`)
export const createProject = (data) => api.post('/projects/', data)
export const updateProject = (id, data) => api.patch(`/projects/${id}/`, data)
export const deleteProject = (id) => api.delete(`/projects/${id}/`)

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

// Project Membership & Access Control APIs
export const getProjectMembers = (projectId) =>
  api.get(`/projects/members/?project_id=${projectId}`)

export const addProjectMember = (data) =>
  api.post('/projects/members/', data)

export const removeProjectMember = (memberId) =>
  api.delete(`/projects/members/${memberId}/`)

// Invitations
export const getProjectInvitations = (projectId) =>
  api.get(`/projects/invitations/?project_id=${projectId}`)

export const createInvitation = (data) =>
  api.post('/projects/invitations/', data)

export const acceptInvitation = (token) =>
  api.post('/projects/invitations/accept/', { token })

export const revokeInvitation = (invitationId) =>
  api.post(`/projects/invitations/${invitationId}/revoke/`)

// Platform Administrator User Management
export const getPlatformUsers = (params) =>
  api.get('/projects/users/', { params })

export const updatePlatformUser = (userId, data) =>
  api.patch(`/projects/users/${userId}/`, data)

// Platform & Project Audit Logs
export const getAuditLogs = (params) =>
  api.get('/projects/audit-logs/', { params })

export default api

