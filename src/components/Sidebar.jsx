import { NavLink } from 'react-router-dom'
import { Home, User, MessageCircle, Search, UserPlus } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Sidebar() {
  const { user } = useAuthStore()

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Find Users' },
    { to: `/profile/${user?.username}`, icon: User, label: 'Profile' },
    { to: '/chat', icon: MessageCircle, label: 'Messages' },
    { to: '/requests', icon: UserPlus, label: 'Requests' },
  ]

  return (
    <aside className="hidden md:block fixed left-0 top-16 bottom-0 w-64 lg:w-72 bg-white border-r border-[var(--color-border)] overflow-y-auto">
      <div className="p-4">
        {/* User Info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[var(--color-primary-light)] to-white mb-6">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
            alt={user?.username}
            className="w-12 h-12 rounded-full avatar ring-2 ring-white"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--color-text-primary)] truncate">
              {user?.display_name || user?.username}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">
              @{user?.username}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)]'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            © 2024 Nexa
          </p>
        </div>
      </div>
    </aside>
  )
}
