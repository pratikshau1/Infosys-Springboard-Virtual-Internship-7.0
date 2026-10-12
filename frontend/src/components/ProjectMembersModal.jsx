import React, { useState, useEffect } from 'react'
import { 
  getProjectMembers, addProjectMember, removeProjectMember, 
  getProjectInvitations, createInvitation, revokeInvitation 
} from '../api'
import { CrossIcon, UsersIcon, CheckIcon, TrashIcon } from './Icons'

export default function ProjectMembersModal({ isOpen, onClose, project, currentUser }) {
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Team Member')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Direct Add Member State (Admin only)
  const [showDirectAdd, setShowDirectAdd] = useState(false)
  const [directUserId, setDirectUserId] = useState('')
  const [directRole, setDirectRole] = useState('Team Member')

  const isPlatformAdmin = currentUser?.is_staff || currentUser?.is_superuser
  const isProjectManager = project?.current_user_role === 'Project Manager' || 
                           project?.current_user_role === 'Platform Administrator' || 
                           isPlatformAdmin ||
                           project?.owner?.id === currentUser?.id

  const loadData = async () => {
    if (!project?.id) return
    setLoading(true)
    setError(null)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        getProjectMembers(project.id),
        getProjectInvitations(project.id)
      ])
      setMembers(membersRes.data || [])
      setInvitations(invitesRes.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load project members or invitations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && project?.id) {
      loadData()
      setSuccessMsg(null)
      setError(null)
    }
  }, [isOpen, project?.id])

  if (!isOpen) return null

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail) return
    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      await createInvitation({
        project_id: project.id,
        email: inviteEmail.trim(),
        role: inviteRole
      })
      setSuccessMsg(`Invitation dispatched to ${inviteEmail}`)
      setInviteEmail('')
      await loadData()
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to dispatch invitation.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevokeInvite = async (invitationId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation token?')) return
    try {
      await revokeInvitation(invitationId)
      setSuccessMsg('Invitation revoked successfully.')
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke invitation.')
    }
  }

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project? Their access will be immediately terminated.`)) return
    try {
      await removeProjectMember(memberId)
      setSuccessMsg(`Revoked project access for ${memberName}.`)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Project Members & Access</h2>
              <p className="text-xs text-gray-400">
                Manage roles and invitations for <span className="text-indigo-400 font-medium">{project.name}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <CrossIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckIcon className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Invitation Section (PM or Admin only) */}
          {isProjectManager && (
            <div className="p-4 bg-gray-950/60 border border-gray-800/80 rounded-xl">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Invite New Contributor
              </h3>
              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Project Manager">Project Manager</option>
                  <option value="Team Member">Team Member</option>
                  <option value="Read-Only Reviewer">Read-Only Reviewer</option>
                </select>
                <button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shrink-0"
                >
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          )}

          {/* Active Members Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Assigned Team Members ({members.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading project access list...</div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-800 rounded-xl text-xs text-gray-500">
                No external members assigned yet. The project owner has full administrative rights.
              </div>
            ) : (
              <div className="border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">User</th>
                      <th className="py-2.5 px-4 font-medium">Role</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium">Assigned</th>
                      {isProjectManager && <th className="py-2.5 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {m.user?.username || m.user?.email || 'User #' + m.id}
                          </div>
                          <div className="text-[11px] text-gray-500">{m.user?.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            m.role === 'Project Manager' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : m.role === 'Read-Only Reviewer'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {m.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        {isProjectManager && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRemoveMember(m.id, m.user?.username || m.user?.email)}
                              title="Revoke Membership"
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Invitations Section */}
          {invitations.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Pending Invitations ({invitations.length})
              </h3>
              <div className="border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/60 text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="py-2 px-4 font-medium">Invitee Email</th>
                      <th className="py-2 px-4 font-medium">Target Role</th>
                      <th className="py-2 px-4 font-medium">Expires</th>
                      <th className="py-2 px-4 font-medium">Status</th>
                      {isProjectManager && <th className="py-2 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-800/20">
                        <td className="py-2.5 px-4 font-medium text-white">{inv.email}</td>
                        <td className="py-2.5 px-4 text-indigo-400">{inv.role}</td>
                        <td className="py-2.5 px-4 text-[11px] text-gray-400">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            inv.is_revoked 
                              ? 'bg-red-500/10 text-red-400' 
                              : inv.is_accepted 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {inv.is_revoked ? 'Revoked' : inv.is_accepted ? 'Accepted' : 'Pending'}
                          </span>
                        </td>
                        {isProjectManager && (
                          <td className="py-2.5 px-4 text-right">
                            {!inv.is_revoked && !inv.is_accepted && (
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="text-[11px] text-red-400 hover:underline"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
