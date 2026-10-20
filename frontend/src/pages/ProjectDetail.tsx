import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, Trash2, RefreshCw, Download, 
  ArrowLeft, Search, ShieldAlert, CheckCircle2, 
  Clock, AlertTriangle, Send, Sparkles, ListTodo
} from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';

interface Project {
  id: string;
  name: string;
  description: string;
  status?: string;
}

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  processing_error?: string;
  uploaded_at: string;
}

interface RiskItem {
  id: string;
  title: string;
  category: string;
  severity: 'High' | 'Medium' | 'Low';
  source_document: string;
  page_number?: number;
}

interface RisksResponse {
  overall_risk_level: string;
  total_risks_identified: number;
  risks: RiskItem[];
}

interface TaskItem {
  id: string;
  task: string;
  owner: string;
  status: string;
  due_date?: string;
  source_file: string;
}

interface TasksResponse {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  progress_percentage: number;
  tasks: TaskItem[];
}

interface AdvisorResult {
  answer: string;
  citations: string[];
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs: 'documents' | 'risks' | 'tasks' | 'advisor'
  const [activeTab, setActiveTab] = useState<'documents' | 'risks' | 'tasks' | 'advisor'>('documents');

  // Intelligence State
  const [risksData, setRisksData] = useState<RisksResponse | null>(null);
  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [advisorQuery, setAdvisorQuery] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorConversation, setAdvisorConversation] = useState<{ query: string; result: AdvisorResult }[]>([]);

  const fetchProjectData = async () => {
    try {
      const [projRes, docRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/documents`)
      ]);
      setProject(projRes.data);
      setDocuments(docRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntelligenceData = async () => {
    try {
      const [risksRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}/risks`),
        api.get(`/projects/${projectId}/tasks`)
      ]);
      setRisksData(risksRes.data);
      setTasksData(tasksRes.data);
    } catch (e) {
      console.error('Error fetching intelligence data', e);
    }
  };

  useEffect(() => {
    fetchProjectData();
    fetchIntelligenceData();
    const interval = setInterval(() => {
      fetchProjectData();
      fetchIntelligenceData();
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < e.target.files.length; i++) {
      const formData = new FormData();
      formData.append('file', e.target.files[i]);
      try {
        await api.post(`/projects/${projectId}/documents`, formData);
      } catch (err: any) {
        console.error('Upload failed', err);
        alert(err.response?.data?.detail || `Upload failed for ${e.target.files[i].name}`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
    fetchProjectData();
    fetchIntelligenceData();
  };

  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;
    try {
      await api.delete(`/projects/${projectId}/documents/${docId}`);
      fetchProjectData();
      fetchIntelligenceData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetry = async (docId: string) => {
    try {
      await api.post(`/projects/${projectId}/documents/${docId}/retry`);
      fetchProjectData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadDoc = (docId: string) => {
    const token = localStorage.getItem('token');
    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const baseUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`;
    window.open(`${baseUrl}/projects/${projectId}/documents/${docId}/download?token=${token}`, '_blank');
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm(`Permanently delete project "${project.name}" and all associated data?`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      navigate('/projects');
    } catch (e) {
      console.error(e);
      alert('Failed to delete project');
    }
  };

  const handleAskAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorQuery.trim() || advisorLoading) return;
    const q = advisorQuery;
    setAdvisorQuery('');
    setAdvisorLoading(true);

    try {
      const res = await api.post(`/projects/${projectId}/advisor/ask`, { query: q });
      setAdvisorConversation(prev => [...prev, { query: q, result: res.data }]);
    } catch (err) {
      console.error(err);
      alert('Advisor query failed');
    } finally {
      setAdvisorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-textMuted">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-error">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-textmain flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6 md:p-8 flex-1 w-full">
        {/* Header Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/projects" className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            <Link to={`/projects/${project.id}/knowledge`} className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5">
              <Search size={14} /> Knowledge Search
            </Link>
            <button onClick={handleDeleteProject} className="p-1.5 text-gray-400 hover:text-error hover:bg-error/10 rounded transition-colors" title="Delete Project">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Project Title Banner */}
        <div className="card mb-8 bg-gradient-to-r from-surface via-surface to-gray-900 border-gray-700/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/20 text-primary border border-primary/30">
                  {project.status || 'Active'}
                </span>
              </div>
              <p className="text-textMuted text-sm max-w-2xl">{project.description || 'No description provided.'}</p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3">
              <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2 text-center">
                <div className="text-lg font-bold text-white">{documents.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-textMuted font-medium">Documents</div>
              </div>
              <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-4 py-2 text-center">
                <div className={`text-lg font-bold ${
                  risksData?.overall_risk_level === 'High' ? 'text-red-400' :
                  risksData?.overall_risk_level === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {risksData?.overall_risk_level || 'None'}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-textMuted font-medium">Risk Level</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700 mb-8 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white'
            }`}
          >
            <FileText size={16} /> Document Pipeline ({documents.length})
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'risks'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white'
            }`}
          >
            <ShieldAlert size={16} /> Risk Advisor ({risksData?.total_risks_identified || 0})
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white'
            }`}
          >
            <ListTodo size={16} /> Tasks & Milestones ({tasksData?.total_tasks || 0})
          </button>

          <button
            onClick={() => setActiveTab('advisor')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'advisor'
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white'
            }`}
          >
            <Sparkles size={16} /> Consult Advisor
          </button>
        </div>

        {/* TAB 1: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-8">
            <div
              className="card flex flex-col items-center justify-center p-10 border-dashed border-2 border-gray-700 hover:border-primary transition-all cursor-pointer bg-gray-900/30 hover:bg-gray-900/60"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                <Upload size={28} />
              </div>
              <h3 className="text-base font-bold text-white">Upload Project Documents</h3>
              <p className="text-xs text-textMuted mt-1">Supports PDF, DOCX, CSV, TXT files up to 10MB</p>
              <input
                type="file"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.docx,.csv,.txt"
              />
              {uploading && <p className="mt-4 text-sm text-primary animate-pulse font-medium">Extracting and indexing text...</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Project Knowledge Documents</h2>
                <span className="text-xs text-textMuted">Auto-extracts text, chunks, and semantic vectors</span>
              </div>

              {documents.length === 0 ? (
                <div className="text-center p-12 bg-surface/50 border border-gray-800 rounded-xl text-textMuted">
                  No documents uploaded yet. Upload reports, specifications, or task sheets to begin analysis.
                </div>
              ) : (
                <div className="overflow-x-auto card !p-0 border border-gray-700/80">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/60 text-xs font-semibold text-textMuted uppercase tracking-wider">
                        <th className="py-3 px-4">Document</th>
                        <th className="py-3 px-4">Format</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Pipeline Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                            <FileText size={18} className="text-primary flex-shrink-0" />
                            <span className="truncate max-w-xs">{doc.name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-textMuted font-mono text-xs">{doc.file_type}</td>
                          <td className="py-3.5 px-4 text-textMuted">{(doc.file_size / 1024).toFixed(0)} KB</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doc.processing_status === 'PROCESSED'
                                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                : doc.processing_status === 'FAILED'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse'
                            }`}>
                              {doc.processing_status === 'PROCESSED' && <CheckCircle2 size={12} />}
                              {doc.processing_status === 'FAILED' && <AlertTriangle size={12} />}
                              {doc.processing_status === 'PROCESSING' && <Clock size={12} />}
                              {doc.processing_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => handleDownloadDoc(doc.id)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                title="Download Document"
                              >
                                <Download size={15} />
                              </button>
                              {doc.processing_status === 'FAILED' && (
                                <button
                                  onClick={() => handleRetry(doc.id)}
                                  className="p-1.5 text-yellow-400 hover:text-white hover:bg-yellow-500/20 rounded transition-colors"
                                  title="Retry Processing"
                                >
                                  <RefreshCw size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                className="p-1.5 text-gray-400 hover:text-error hover:bg-error/10 rounded transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI RISK ADVISOR */}
        {activeTab === 'risks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-gray-900/60 border-gray-700">
                <div className="text-xs uppercase tracking-wider text-textMuted font-semibold mb-1">Overall Risk Level</div>
                <div className={`text-2xl font-black ${
                  risksData?.overall_risk_level === 'High' ? 'text-red-400' :
                  risksData?.overall_risk_level === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {risksData?.overall_risk_level || 'Minimal'}
                </div>
                <p className="text-xs text-textMuted mt-1">Calculated from document impact analysis</p>
              </div>

              <div className="card bg-gray-900/60 border-gray-700">
                <div className="text-xs uppercase tracking-wider text-textMuted font-semibold mb-1">Total Risk Flags</div>
                <div className="text-2xl font-black text-white">{risksData?.total_risks_identified || 0}</div>
                <p className="text-xs text-textMuted mt-1">Extracted from specifications & reports</p>
              </div>

              <div className="card bg-gray-900/60 border-gray-700">
                <div className="text-xs uppercase tracking-wider text-textMuted font-semibold mb-1">Advisor Recommendation</div>
                <div className="text-sm font-semibold text-primary mt-1">
                  {risksData && risksData.total_risks_identified > 0 ? 'Action items require mitigation' : 'No active blockers detected'}
                </div>
                <p className="text-xs text-textMuted mt-1">Keep monitoring project timelines & dependencies</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">Identified Project Risk Register</h2>
              {!risksData || risksData.risks.length === 0 ? (
                <div className="card text-center p-12 text-textMuted bg-gray-900/30">
                  <ShieldAlert size={40} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm font-medium">No critical risk factors detected in the current documents.</p>
                  <p className="text-xs text-gray-500 mt-1">Upload progress reports or technical memos containing schedule and technical details.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {risksData.risks.map((risk, idx) => (
                    <div key={idx} className="card bg-surface/80 hover:border-gray-600 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            risk.severity === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            risk.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {risk.severity} Severity
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                            {risk.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium leading-relaxed">{risk.title}</p>
                      </div>

                      <div className="text-xs text-textMuted flex items-center gap-2 flex-shrink-0">
                        <FileText size={13} className="text-primary" />
                        <span>{risk.source_document}</span>
                        {risk.page_number && <span className="text-[11px] bg-gray-800 px-1.5 py-0.5 rounded">p. {risk.page_number}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TASKS & MILESTONES */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="card bg-gradient-to-r from-surface to-gray-900 border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase tracking-wider text-textMuted font-bold">Milestone Completion Rate</span>
                <span className="text-base font-extrabold text-accent">{tasksData?.progress_percentage || 0}%</span>
              </div>
              <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden border border-gray-700">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-500"
                  style={{ width: `${tasksData?.progress_percentage || 0}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                <div className="border-r border-gray-800">
                  <div className="text-lg font-bold text-green-400">{tasksData?.completed_tasks || 0}</div>
                  <div className="text-xs text-textMuted font-medium">Done</div>
                </div>
                <div className="border-r border-gray-800">
                  <div className="text-lg font-bold text-yellow-400">{tasksData?.in_progress_tasks || 0}</div>
                  <div className="text-xs text-textMuted font-medium">In Progress</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-400">{tasksData?.pending_tasks || 0}</div>
                  <div className="text-xs text-textMuted font-medium">Pending</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">Structured Task Register</h2>
              {!tasksData || tasksData.tasks.length === 0 ? (
                <div className="card text-center p-12 text-textMuted bg-gray-900/30">
                  <ListTodo size={40} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm font-medium">No structured tasks ingested yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Upload a CSV task file (e.g., from sample-data/tasks.csv) to automatically visualize milestone deliverables.</p>
                </div>
              ) : (
                <div className="card !p-0 overflow-x-auto border-gray-700/80">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/60 text-xs font-semibold text-textMuted uppercase">
                        <th className="py-3 px-4">Task ID</th>
                        <th className="py-3 px-4">Task Description</th>
                        <th className="py-3 px-4">Owner</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                      {tasksData.tasks.map((task, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40">
                          <td className="py-3 px-4 font-mono text-xs text-primary">{task.id}</td>
                          <td className="py-3 px-4 text-white font-medium">{task.task}</td>
                          <td className="py-3 px-4 text-textMuted">{task.owner}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.status.toLowerCase() === 'done' ? 'bg-green-500/20 text-green-400' :
                              task.status.toLowerCase() === 'in progress' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-textMuted font-mono text-xs">{task.due_date || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONSULT ADVISOR */}
        {activeTab === 'advisor' && (
          <div className="space-y-6">
            <div className="card bg-gradient-to-r from-surface to-gray-900 border-gray-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-primary" /> AI Project Intelligence Consultation
              </h2>
              <p className="text-xs text-textMuted">Ask the Risk Advisor questions about your uploaded documents, project bottlenecks, or mitigations.</p>

              <form onSubmit={handleAskAdvisor} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. What are the biggest risks identified in Milestone 1?"
                  className="input-field flex-1"
                  value={advisorQuery}
                  onChange={e => setAdvisorQuery(e.target.value)}
                />
                <button type="submit" disabled={advisorLoading} className="btn-primary flex items-center gap-1.5 px-5">
                  <Send size={15} /> {advisorLoading ? 'Analyzing...' : 'Ask'}
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {advisorConversation.length === 0 ? (
                <div className="card text-center p-12 text-textMuted bg-gray-900/30">
                  <Sparkles size={36} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm font-medium">No questions asked yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Try asking: "What are the project objectives?" or "Identify any schedule bottlenecks."</p>
                </div>
              ) : (
                advisorConversation.map((entry, idx) => (
                  <div key={idx} className="card space-y-3 bg-surface/90 border-gray-700">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                      <span>Query:</span>
                      <span className="text-white normal-case font-medium">{entry.query}</span>
                    </div>

                    <div className="bg-gray-800/60 p-4 rounded-lg text-sm text-gray-200 leading-relaxed whitespace-pre-wrap border border-gray-700/50">
                      {entry.result.answer}
                    </div>

                    {entry.result.citations && entry.result.citations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-textMuted font-medium">Source Citations:</span>
                        {entry.result.citations.map((cite, cIdx) => (
                          <span key={cIdx} className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded-full">
                            {cite}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
