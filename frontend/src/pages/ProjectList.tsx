import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Trash2, ArrowRight, Activity } from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';

interface Project {
  id: string;
  name: string;
  description: string;
  status?: string;
  updated_at: string;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await api.post('/projects', { name: newProjectName, description: newProjectDesc });
      setShowNew(false);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects();
    } catch (e) {
      console.error(e);
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This will also remove associated documents and analysis.`)) {
      return;
    }
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (e) {
      console.error(e);
      alert('Failed to delete project');
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-textmain flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6 md:p-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Projects
              <span className="text-xs bg-gray-800 text-textMuted px-2.5 py-1 rounded-full border border-gray-700">
                {projects.length} Total
              </span>
            </h1>
            <p className="text-textMuted text-sm mt-1">Manage knowledge bases, monitor risk indicators, and explore project documents.</p>
          </div>
          <button className="btn-primary flex items-center gap-2 shadow-primary/20" onClick={() => setShowNew(true)}>
            <Plus size={18} /> New Project
          </button>
        </div>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search projects by name or description..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {showNew && (
          <div className="card mb-8 border-primary/40 bg-gradient-to-b from-surface to-gray-900/90 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-textMuted mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Lunar Mission, ERP Migration"
                  required
                  className="input-field"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-textMuted mb-1">Description</label>
                <textarea
                  placeholder="Summarize the project objectives, scope, or background..."
                  rows={3}
                  className="input-field"
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-16 text-textMuted">
            <Activity className="animate-spin mr-3 text-primary" size={24} />
            Loading project repository...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-16 card border-dashed border-gray-700 bg-gray-900/40">
            <Folder size={52} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-bold text-white">No projects found</h3>
            <p className="text-textMuted text-sm mt-1 mb-6">Create your first project to start ingesting documents and analyzing project risks.</p>
            <button className="btn-primary inline-flex items-center gap-2" onClick={() => setShowNew(true)}>
              <Plus size={16} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(project => (
              <div
                key={project.id}
                className="card group hover:border-primary/60 transition-all duration-200 flex flex-col h-full bg-surface/70 hover:bg-surface hover:shadow-2xl hover:shadow-primary/5"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                    {project.name}
                  </h3>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/20">
                    Active
                  </span>
                </div>
                
                <p className="text-textMuted text-sm flex-grow mb-6 line-clamp-3 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>

                <div className="border-t border-gray-700/80 pt-4 flex justify-between items-center mt-auto">
                  <span className="text-xs text-gray-400">
                    Updated {new Date(project.updated_at || Date.now()).toLocaleDateString()}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      className="p-1.5 text-gray-400 hover:text-error hover:bg-error/10 rounded transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </button>
                    <Link
                      to={`/projects/${project.id}`}
                      className="btn-secondary !py-1 !px-3 text-xs font-semibold flex items-center gap-1 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                    >
                      Open <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
