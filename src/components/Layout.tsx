import { NavLink, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, ClipboardList, Star, Salad, BarChart3, User, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import useAppStore from '@/store'

const navItems = [
  { to: '/', icon: UtensilsCrossed, label: '今日菜单' },
  { to: '/menu', icon: ClipboardList, label: '菜单管理' },
  { to: '/recommend', icon: Star, label: '智能推荐' },
  { to: '/nutrition', icon: Salad, label: '营养追踪' },
  { to: '/stats', icon: BarChart3, label: '统计后台' },
  { to: '/profile', icon: User, label: '个人中心' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser, sidebarCollapsed, toggleSidebar } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    setCurrentUser(null)
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <aside
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-brown text-white flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-brown-light">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-bold text-primary">🍽️ 食堂点评</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-btn hover:bg-brown-light transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-btn transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:bg-brown-light hover:text-white'
                } ${sidebarCollapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-brown-light">
          {currentUser ? (
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                {currentUser.name?.[0] || 'U'}
              </div>
              {!sidebarCollapsed && (
                <>
                  <span className="text-sm truncate flex-1">{currentUser.name}</span>
                  <button onClick={handleLogout} className="p-1 hover:text-primary transition-colors">
                    <LogOut size={16} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <LogIn size={18} />
              {!sidebarCollapsed && <span className="text-sm">登录</span>}
            </NavLink>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="page-enter p-6">{children}</div>
      </main>
    </div>
  )
}
