import React, { useState, useEffect } from 'react'
import { getPlatformUsers, updatePlatformUser, getAuditLogs } from '../api'
import { UsersIcon, ShieldIcon, CheckIcon, RefreshIcon, SearchIcon } from './Icons'

export default function UsersManagementView() {
  const [activeTab, setActiveTab] = useState('users') // 'users' or 'audit'
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPlatformUsers({ search })
      setUsers(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load platform users. Platform Administrator credentials required.')
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs()
      setAuditLogs(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    } else {
      loadAuditLogs()
    }
  }, [activeTab])

  const handleToggleStaff = async (user) => {
    const action = user.is_staff ? 'revoke administrator rights from' : 'grant administrator rights to'
    if (!window.confirm(`Are you sure you want to ${action} ${user.username || user.email}?`)) return

    try {
      await updatePlatformUser(user.id, { is_staff: !user.is_staff })
      setSuccessMsg(`Updated permissions for ${user.username || user.email}`)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user role.')
    }
  }

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'deactivate' : 'activate'
    if (!window.confirm(`Are you sure you want to ${action} account ${user.username || user.email}?`)) return

    try {
      await updatePlatformUser(user.id, { is_active: !user.is_active })
      setSuccessMsg(`Account status changed for ${user.username || user.email}`)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account status.')
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch = (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (roleFilter === 'ADMIN') return u.is_staff || u.is_superuser
    if (roleFilter === 'STANDARD') return !u.is_staff && !u.is_superuser
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
              Administration
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Platform Governance & Security</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage user accounts, assign platform roles, inspect project memberships, and review security audit trails.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
          <CheckIcon className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Platform Administrators</option>
                <option value="STANDARD">Standard Accounts</option>
              </select>

              <button
                onClick={loadUsers}
                className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors"
                title="Refresh"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-3 px-5 font-semibold">User</th>
                  <th className="py-3 px-5 font-semibold">Platform Role</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold">Project Memberships</th>
                  <th className="py-3 px-5 text-right font-semibold">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdmin = u.is_staff || u.is_superuser
                    return (
                      <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-white">
                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                          </div>
                          <div className="text-[11px] text-gray-500">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isAdmin
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            {u.is_superuser ? 'Superuser' : isAdmin ? 'Platform Administrator' : 'Platform User'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] ${
                            u.is_active ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex flex-wrap gap-1">
                            {u.memberships && u.memberships.length > 0 ? (
                              u.memberships.map((m, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-gray-300">
                                  {m.project_name} ({m.role})
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-[11px]">No memberships</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button
                            onClick={() => handleToggleStaff(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                              isAdmin
                                ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
                                : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                            }`}
                          >
                            {isAdmin ? 'Demote' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                              u.is_active
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Audit Trail View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Immutable ledger of platform access decisions, membership changes, and administrative overrides.
            </p>
            <button
              onClick={loadAuditLogs}
              className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/60 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="py-3 px-5 font-semibold">Timestamp</th>
                  <th className="py-3 px-5 font-semibold">Actor</th>
                  <th className="py-3 px-5 font-semibold">Action</th>
                  <th className="py-3 px-5 font-semibold">Target Resource</th>
                  <th className="py-3 px-5 font-semibold">Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-5 text-gray-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-5 font-semibold text-white">
                        {log.actor?.username || log.actor?.email || 'System'}
                      </td>
                      <td className="py-3 px-5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-300 font-mono text-[11px]">
                        {log.target_resource}
                      </td>
                      <td className="py-3 px-5 text-gray-400">
                        {log.project_name || 'Platform-wide'}
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
  )
}
