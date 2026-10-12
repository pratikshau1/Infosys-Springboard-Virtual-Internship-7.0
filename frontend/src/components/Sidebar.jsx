import { Link, useLocation } from 'react-router-dom'
import { 
  DashboardIcon, DocumentIcon, ScopeIcon, 
  RiskIcon, BlockerIcon, AssistantIcon 
} from './Icons'

const Sidebar = () => {
  const location = useLocation()
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: DashboardIcon },
    { name: 'Documents', path: '/documents', icon: DocumentIcon },
    { name: 'Scope', path: '/scope', icon: ScopeIcon },
    { name: 'Risks', path: '/risks', icon: RiskIcon },
    { name: 'Blockers', path: '/blockers', icon: BlockerIcon },
    { name: 'AI Assistant', path: '/assistant', icon: AssistantIcon },
  ]

  return (
    <aside className="w-64 bg-gray-950/80 backdrop-blur-xl border-r border-gray-800 flex flex-col transition-all duration-300 relative z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          AI Project Advisor
        </h1>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Intelligence Layer</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0 transition-colors" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-6 border-t border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-[2px]">
            <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-sm font-bold">
              US
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">User Profile</p>
            <p className="text-xs text-gray-500">Project Manager</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
