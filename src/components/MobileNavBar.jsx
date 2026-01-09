import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Play, Users, MessageCircle, UserPlus } from 'lucide-react'

export default function MobileNavBar() {
    const location = useLocation()
    const navigate = useNavigate()

    const navItems = [
        { id: 'home', label: 'Home', icon: Home, path: '/' },
        { id: 'reels', label: 'Reels', icon: Play, path: '/reels' },
        { id: 'users', label: 'Users', icon: Users, path: '/users' },
        { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/chat' },
        { id: 'requests', label: 'Requests', icon: UserPlus, path: '/requests' }
    ]

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/'
        }
        return location.pathname.startsWith(path)
    }

    const isReels = location.pathname === '/reels'

    return (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-area-bottom transition-all duration-300 ${isReels
            ? 'bg-black border-t border-white/10'
            : 'bg-white border-t border-(--color-border)'
            }`}>
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.path)

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all ${active
                                ? 'text-(--color-primary)'
                                : isReels ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg)'
                                }`}
                        >
                            <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                            <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
