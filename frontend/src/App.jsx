import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import DocumentsView from './components/DocumentsView'
import ScopeView from './components/ScopeView'
import RisksView from './components/RisksView'
import BlockersView from './components/BlockersView'
import AssistantView from './components/AssistantView'
import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ProjectsView from './components/ProjectsView'
import UsersManagementView from './components/UsersManagementView'
import { SearchIcon } from './components/Icons'

function AppLayout({ activeProjectId, setActiveProjectId }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      <Sidebar currentProjectId={activeProjectId} onSelectProject={setActiveProjectId} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/20 via-purple-900/10 to-transparent -z-10 pointer-events-none"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="p-8 max-w-7xl mx-auto min-h-full">
          <Routes>
            <Route path="/" element={<Dashboard projectId={activeProjectId} />} />
            <Route path="/projects" element={<ProjectsView onSelectProject={setActiveProjectId} />} />
            <Route path="/users" element={<UsersManagementView />} />
            <Route path="/documents" element={<DocumentsView projectId={activeProjectId} />} />
            <Route path="/scope" element={<ScopeView projectId={activeProjectId} />} />
            <Route path="/risks" element={<RisksView projectId={activeProjectId} />} />
            <Route path="/blockers" element={<BlockersView projectId={activeProjectId} />} />
            <Route path="/assistant" element={<AssistantView projectId={activeProjectId} />} />
            <Route path="*" element={
              <div className="text-center mt-24 text-gray-400">
                <SearchIcon className="w-12 h-12 text-indigo-400/60 mx-auto mb-4" />
                <p className="text-lg font-semibold text-white">Page Not Found</p>
                <p className="text-xs text-gray-500 mt-1">The requested intelligence route does not exist.</p>
              </div>
            } />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [activeProjectId, setActiveProjectId] = useState(1)

  return (
    <Router>
      <Routes>
        {/* Public Landing & Auth Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Intelligence Application Workspace Routes */}
        <Route 
          path="/app/*" 
          element={
            <AppLayout 
              activeProjectId={activeProjectId} 
              setActiveProjectId={setActiveProjectId} 
            />
          } 
        />

        {/* Direct /projects route */}
        <Route path="/projects" element={<Navigate to="/app/projects" replace />} />

        {/* Direct shortcuts */}
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="/documents" element={<Navigate to="/app/documents" replace />} />
        <Route path="/scope" element={<Navigate to="/app/scope" replace />} />
        <Route path="/risks" element={<Navigate to="/app/risks" replace />} />
        <Route path="/blockers" element={<Navigate to="/app/blockers" replace />} />
        <Route path="/assistant" element={<Navigate to="/app/assistant" replace />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
