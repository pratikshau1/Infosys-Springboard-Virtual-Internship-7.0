import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ArrowLeft, Database, Layers, Sparkles } from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';

interface SearchResult {
  document_id: string;
  document_name: string;
  chunk_id: string;
  text: string;
  page_number: number | null;
  section: string | null;
  similarity: number;
}

interface Stats {
  documents_indexed: number;
  knowledge_chunks: number;
}

export default function KnowledgeBase() {
  const { projectId } = useParams();
  const [stats, setStats] = useState<Stats>({ documents_indexed: 0, knowledge_chunks: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const sampleQueries = [
    'What are the primary project objectives?',
    'What risks or bottlenecks are identified?',
    'What are the schedule milestones and deadlines?',
    'System architecture and database requirements'
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/knowledge/stats`);
        setStats(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [projectId]);

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.post(`/projects/${projectId}/knowledge/search`, { query: searchQuery, top_k: 6 });
      setResults(res.data.results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleChipClick = (qText: string) => {
    setQuery(qText);
    executeSearch(qText);
  };

  return (
    <div className="min-h-screen bg-background text-textmain flex flex-col">
      <Navbar />

      <main className="max-w-5xl mx-auto p-6 md:p-8 flex-1 w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to Project Overview
          </Link>
          <span className="text-xs uppercase tracking-wider font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            Project-Isolated Semantic Space
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card text-center py-6 bg-surface/70 border-gray-700">
            <div className="flex justify-center items-center text-primary mb-2">
              <Database size={22} />
            </div>
            <div className="text-3xl font-extrabold text-white mb-1">{stats.documents_indexed}</div>
            <div className="text-textMuted text-xs font-semibold uppercase tracking-wider">Documents Indexed</div>
          </div>
          <div className="card text-center py-6 bg-surface/70 border-gray-700">
            <div className="flex justify-center items-center text-accent mb-2">
              <Layers size={22} />
            </div>
            <div className="text-3xl font-extrabold text-accent mb-1">{stats.knowledge_chunks}</div>
            <div className="text-textMuted text-xs font-semibold uppercase tracking-wider">Knowledge Chunks</div>
          </div>
        </div>

        <div className="card mb-6 border-gray-700 bg-surface/90 shadow-2xl">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search knowledge items (e.g. 'What are the major project objectives?')..."
              className="w-full bg-gray-800/90 border border-gray-700 rounded-xl pl-12 pr-32 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-all text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary !py-2 !px-5 text-sm"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Quick Query Suggestions */}
          <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap items-center gap-2">
            <span className="text-xs text-textMuted flex items-center gap-1 font-medium">
              <Sparkles size={12} className="text-primary" /> Suggestions:
            </span>
            {sampleQueries.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(sample)}
                className="text-xs bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
            <span>Semantic Search Results</span>
            {results.length > 0 && (
              <span className="text-xs text-textMuted font-normal">Found {results.length} relevant chunks</span>
            )}
          </h2>

          {results.length === 0 ? (
            <div className="text-center p-14 text-textMuted bg-gray-900/30 rounded-xl border border-gray-800">
              <Search size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm font-medium">Enter a query or click a suggestion above to search the project knowledge base.</p>
              <p className="text-xs text-gray-500 mt-1">Queries are evaluated against semantic chunk embeddings.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="card bg-surface/80 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-start mb-3 border-b border-gray-700/80 pb-2.5">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                        <span className="text-primary">{result.document_name}</span>
                        {result.page_number && (
                          <span className="text-[11px] bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded">
                            Page {result.page_number}
                          </span>
                        )}
                      </h3>
                      {result.section && <p className="text-xs text-gray-400 mt-0.5">{result.section}</p>}
                    </div>
                    <div className="text-xs bg-accent/15 text-accent border border-accent/20 px-2.5 py-0.5 rounded-full font-bold">
                      {(result.similarity * 100).toFixed(0)}% Match
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{result.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
