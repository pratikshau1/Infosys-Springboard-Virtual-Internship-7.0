import { Link } from 'react-router-dom'
import { 
  DashboardIcon, DocumentIcon, ScopeIcon, 
  RiskIcon, BlockerIcon, AssistantIcon, 
  ShieldIcon, BoltIcon, CheckIcon, ChevronRightIcon 
} from './Icons'

const LandingPage = () => {
  const features = [
    {
      icon: DocumentIcon,
      title: "Vector Document Ingestion",
      description: "Upload PDF, DOCX, CSV, or TXT project proposals, SRS documents, and sprint minutes with automated semantic chunking."
    },
    {
      icon: ScopeIcon,
      title: "Scope & Requirement Extraction",
      description: "Gemini-powered agents automatically structure functional boundaries, user stories, goals, and delivery milestones."
    },
    {
      icon: RiskIcon,
      title: "Risk Exposure & Mitigation",
      description: "Classifies risk severity, probability, and business impact with automated proactive mitigation strategy generation."
    },
    {
      icon: BlockerIcon,
      title: "Blocker & Impediment Tracking",
      description: "Identifies active dependencies, technical bottlenecks, task owners, and critical path delays in real time."
    },
    {
      icon: DashboardIcon,
      title: "Deterministic Health Scoring",
      description: "Weighted algorithm (PRD §5.6) scoring Scope (20%), Timeline (25%), Blockers (20%), Risks (15%), Progress (10%), and Docs (10%)."
    },
    {
      icon: AssistantIcon,
      title: "Grounded RAG Assistant",
      description: "Conversational project intelligence assistant trained on your ChromaDB vector store with exact document citations."
    }
  ]

  const workflowSteps = [
    {
      step: "01",
      title: "Upload Project Documents",
      desc: "Drag-and-drop proposals, architectural specs, sprint logs, or spreadsheets."
    },
    {
      step: "02",
      title: "Vector Ingestion & Multi-Agent Analysis",
      desc: "ChromaDB indexes embeddings while Gemini agents analyze scope, risks, and blockers."
    },
    {
      step: "03",
      title: "Monitor Intelligence & Health",
      desc: "Track delivery forecast slips, risk distributions, health trends, and chat with your project assistant."
    }
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <BoltIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">AI Project Advisor</span>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block -mt-1">Intelligence Layer</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Multi-Agent AI & Vector RAG Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Turn Scattered Project Docs Into <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
              Living Project Intelligence
            </span>
          </h1>

          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Ingest proposals, SRS specs, risk logs, and sprint minutes. Automatically forecast delivery slips, identify critical bottlenecks, score project health, and query documents with verified source citations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/app"
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Launch Dashboard</span>
              <ChevronRightIcon className="w-4 h-4" />
            </Link>

            <Link
              to="/register"
              className="px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-2xl text-sm font-semibold transition-all"
            >
              Create Account
            </Link>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white">6 Agents</p>
              <p className="text-xs text-gray-400 mt-1">Multi-Agent Suite</p>
            </div>
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">PRD §5.6</p>
              <p className="text-xs text-gray-400 mt-1">Health Formula</p>
            </div>
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">ChromaDB</p>
              <p className="text-xs text-gray-400 mt-1">Vector Storage</p>
            </div>
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">100%</p>
              <p className="text-xs text-gray-400 mt-1">Grounded RAG</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-gray-900 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Features</span>
            <h2 className="text-3xl font-bold text-white">Enterprise Project Intelligence Capabilities</h2>
            <p className="text-sm text-gray-400">Everything needed to supervise complex software engineering initiatives.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon
              return (
                <div 
                  key={idx}
                  className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 hover:border-gray-700 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700/60 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-600/10 group-hover:border-indigo-500/30 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="py-20 border-t border-gray-900 bg-gray-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Pipeline</span>
            <h2 className="text-3xl font-bold text-white">End-to-End Workflow</h2>
            <p className="text-sm text-gray-400">From raw files to automated risk mitigation and grounded queries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {workflowSteps.map((s, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative">
                <span className="text-3xl font-extrabold text-indigo-400/30 block mb-3">{s.step}</span>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="border-t border-gray-800 py-12 bg-gray-950 text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-2xl font-bold text-white">Ready to elevate your project oversight?</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Experience proactive risk forecasting and intelligent assistance designed for modern engineering teams.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/app"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
            >
              Open Project Intelligence App
            </Link>
          </div>
          <p className="text-[11px] text-gray-600 pt-6">
            Infosys Springboard Virtual Internship 7.0 &bull; AI Project Intelligence & Risk Advisor
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
