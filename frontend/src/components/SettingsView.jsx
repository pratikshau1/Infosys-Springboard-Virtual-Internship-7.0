import React, { useState, useEffect } from 'react'
import { 
  getCurrentUser, updateCurrentUser, getProject, updateProject, 
  getProjectMembers, getProjectInvitations 
} from '../api'
import { 
  SettingsIcon, UserIcon, ShieldIcon, CheckIcon, 
  UsersIcon, FolderIcon, CrossIcon 
} from './Icons'

export default function SettingsView({ projectId = 1 }) {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'preferences' | 'security' | 'project' | 'team'
  const [currentUser, setCurrentUser] = useState(null)
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: '' }

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: ''
  })

  // Preferences State
  const [preferences, setPreferences] = useState({
    theme: 'Dark Graphite (Default)',
    notifications: true,
    compactView: false,
    aiDetailLevel: 'Detailed Analysis'
  })

  // Security Form State
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  // Project Settings Form State
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    category: '',
    priority: '',
    status: '',
    target_date: ''
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [userRes, projRes, membersRes, invitesRes] = await Promise.all([
        getCurrentUser().catch(() => ({ data: null })),
        projectId ? getProject(projectId).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
        projectId ? getProjectMembers(projectId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        projectId ? getProjectInvitations(projectId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ])

      if (userRes.data) {
        setCurrentUser(userRes.data)
        setProfileForm({
          username: userRes.data.username || '',
          email: userRes.data.email || '',
          first_name: userRes.data.first_name || '',
          last_name: userRes.data.last_name || ''
        })
      }

      if (projRes.data) {
        setProject(projRes.data)
        setProjectForm({
          name: projRes.data.name || '',
          description: projRes.data.description || '',
          category: projRes.data.category || '',
          priority: projRes.data.priority || 'Medium',
          status: projRes.data.status || 'In Progress',
          target_date: projRes.data.target_date || ''
        })
      }

      setMembers(membersRes.data || [])
      setInvitations(invitesRes.data || [])
    } catch (err) {
      console.error(err)
      setFeedback({ type: 'error', message: 'Failed to load settings data.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const showNotification = (type, message) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Save Profile Details
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateCurrentUser({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email
      })
      setCurrentUser(res.data)
      showNotification('success', 'Profile details updated successfully.')
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  // Change Password
  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification('error', 'New passwords do not match.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      showNotification('error', 'Password must be at least 8 characters long.')
      return
    }

    setSaving(true)
    try {
      await updateCurrentUser({ password: passwordForm.newPassword })
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      showNotification('success', 'Password updated successfully.')
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  // Save Project Settings (PM / Admin only)
  const handleSaveProject = async (e) => {
    e.preventDefault()
    if (!project?.id) return
    setSaving(true)
    try {
      const res = await updateProject(project.id, projectForm)
      setProject(res.data)
      showNotification('success', `Project "${res.data.name}" updated successfully.`)
    } catch (err) {
      showNotification('error', err.response?.data?.error || 'Failed to update project settings.')
    } finally {
      setSaving(false)
    }
  }

  const isPlatformAdmin = currentUser?.is_staff || currentUser?.is_superuser
  const isProjectManager = project?.current_user_role === 'Project Manager' || 
                           project?.current_user_role === 'Platform Administrator' || 
                           isPlatformAdmin ||
                           project?.owner?.id === currentUser?.id

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: UserIcon },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: ShieldIcon },
    { id: 'project', label: 'Project Settings', icon: FolderIcon },
    { id: 'team', label: 'Team Members', icon: UsersIcon },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DB9558]/10 text-[#DB9558] border border-[#DB9558]/20 uppercase tracking-widest">
              Configuration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1.5 flex items-center gap-2.5">
            Settings & Governance
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your account credentials, workspace preferences, and project permissions for <span className="text-indigo-400 font-semibold">{project?.name || 'Active Project'}</span>.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckIcon className="w-4 h-4 shrink-0" /> : <ShieldIcon className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:text-white">
            <CrossIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#DB9558] to-[#97A87A] text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-gray-500">Loading settings configuration...</div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* 1. PROFILE SECTION */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Personal Details</h3>
                <p className="text-xs text-gray-400">Update your public display identity and email address.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1.5">Username</label>
                <input
                  type="text"
                  disabled
                  value={profileForm.username}
                  className="w-full bg-gray-950 border border-gray-800 text-gray-500 rounded-xl px-3.5 py-2.5 text-xs cursor-not-allowed"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Usernames are unique platform identifiers and cannot be altered.</span>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#DB9558] hover:bg-[#c68246] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  {saving ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          )}

          {/* 2. PREFERENCES SECTION */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Interface & AI Preferences</h3>
                <p className="text-xs text-gray-400">Configure visual themes and advisor depth settings.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Visual Theme</span>
                    <span className="text-[11px] text-gray-500">Curated enterprise dark palette (#DB9558, #FCF9EA, #97A87A)</span>
                  </div>
                  <span className="px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg font-medium">
                    {preferences.theme}
                  </span>
                </div>

                <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">AI Assistant Verbosity</span>
                    <span className="text-[11px] text-gray-500">Provide detailed breakdown with source attribution</span>
                  </div>
                  <select 
                    value={preferences.aiDetailLevel}
                    onChange={(e) => setPreferences(prev => ({ ...prev, aiDetailLevel: e.target.value }))}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Detailed Analysis">Detailed Analysis</option>
                    <option value="Concise Summary">Concise Summary</option>
                    <option value="Bullet Points Only">Bullet Points Only</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Email Telemetry Digest</span>
                    <span className="text-[11px] text-gray-500">Receive alerts when health score slips or new risks are identified</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => setPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600 bg-gray-900 border-gray-700 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => showNotification('success', 'Preferences updated successfully.')}
                  className="px-5 py-2.5 bg-[#DB9558] hover:bg-[#c68246] text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* 3. SECURITY SECTION */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Account Security & Credentials</h3>
                <p className="text-xs text-gray-400">Update your account password using Django's secure hashers.</p>
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                Password should be at least 8 characters long and contain a mix of uppercase letters, numbers, and symbols.
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || !passwordForm.newPassword}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  {saving ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* 4. PROJECT SETTINGS SECTION */}
          {activeTab === 'project' && (
            <div className="max-w-xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Project Metadata & Parameters</h3>
                <p className="text-xs text-gray-400">Configure parameters for <span className="text-indigo-400 font-semibold">{project?.name}</span>.</p>
              </div>

              {!isProjectManager ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                  You have read-only access to this project. Only assigned Project Managers or Platform Administrators can modify project configuration.
                </div>
              ) : (
                <form onSubmit={handleSaveProject} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1.5">Project Name</label>
                    <input
                      type="text"
                      required
                      value={projectForm.name}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1.5">Description</label>
                    <textarea
                      rows={3}
                      value={projectForm.description}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-300 block mb-1.5">Category</label>
                      <input
                        type="text"
                        value={projectForm.category}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300 block mb-1.5">Priority</label>
                      <select
                        value={projectForm.priority}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 bg-[#DB9558] hover:bg-[#c68246] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                    >
                      {saving ? 'Updating Project...' : 'Save Project Settings'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 5. TEAM MEMBERS SECTION */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Project Access & Contributor Roster</h3>
                <p className="text-xs text-gray-400">Current contributors assigned to <span className="text-indigo-400 font-semibold">{project?.name}</span>.</p>
              </div>

              <div className="border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Member</th>
                      <th className="py-2.5 px-4 font-semibold">Assigned Role</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold">Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-gray-500">
                          No team members assigned yet.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-800/30">
                          <td className="py-3 px-4 font-semibold text-white">
                            {m.user?.first_name || m.user?.username || m.user?.email}
                            <span className="block text-[11px] font-normal text-gray-500">{m.user?.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-emerald-400 font-medium">
                            {m.status || 'Active'}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-[11px]">
                            {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
