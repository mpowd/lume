import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sparkles, MessageSquare, Database, BarChart3 } from 'lucide-react'

const navigation = [
  { name: 'Chat', href: '/', icon: MessageSquare },
  { name: 'Assistants', href: '/assistants', icon: Sparkles },
  { name: 'Knowledge Base', href: '/knowledge_base', icon: Database },
  { name: 'Evaluation', href: '/evaluation', icon: BarChart3 },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Mobile Menu Button - Fixed Top Left */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 hover:bg-border-subtle rounded-lg transition-colors active:scale-95 bg-background-elevated border border-border-default"
      >
        <Menu className="w-5 h-5 text-text-tertiary" />
      </button>
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 bg-background-elevated border-r border-border-subtle
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Close button for mobile (in sidebar) */}
          <div className="lg:hidden absolute top-4 right-4">
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-border-subtle rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Logo/Header Area */}
          <div className="p-6 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-teal to-brand-teal-dark flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Lume v2.0</div>
                <div className="text-xs text-text-quaternary">Assistant Platform</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    w-full group relative overflow-hidden px-4 py-3 rounded-xl
                    flex items-center gap-3
                    transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-white border border-border-strong' 
                      : 'hover:bg-border-subtle border border-transparent hover:border-border-default'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-brand-teal' : 'text-text-tertiary'}`} />
                  <span className={`text-sm font-medium ${isActive ? 'text-black' : 'text-text-tertiary'}`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-border-subtle">
            <div className="text-[11px] text-text-quaternary space-y-0.5">
              <div>© 2024 Lume</div>
              <div>All rights reserved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}