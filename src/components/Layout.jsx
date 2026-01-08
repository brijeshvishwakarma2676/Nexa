import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileNavBar from './MobileNavBar'
import InstallPrompt from './InstallPrompt'
import { useChatStore } from '../stores/chatStore'
import { useNotificationStore } from '../stores/notificationStore'
import { Toaster } from 'react-hot-toast'

function Layout() {
  const { connectWebSocket, disconnectWebSocket } = useChatStore()
  const { fetchUnreadCount } = useNotificationStore()
  const location = useLocation()

  useEffect(() => {
    // Connect WebSocket on mount
    connectWebSocket()

    // Fetch notification count
    fetchUnreadCount()

    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => {
      clearInterval(interval)
      disconnectWebSocket()
    }
  }, [connectWebSocket, disconnectWebSocket, fetchUnreadCount])

  const isReelsPage = location.pathname === '/reels'
  const isChatPage = location.pathname.startsWith('/chat')

  return (
    <div className="min-h-screen bg-(--color-bg)">
      <Toaster position="top-right" />
      {/* Top Navigation - Always shown except Reels (or as per design) */}
      {!isReelsPage && <Navbar />}

      <div className={`flex ${!isChatPage && !isReelsPage ? 'mt-3' : ''}`}>
        {/* Left Sidebar - Hidden on mobile, shown on desktop (except for Reels and Chat) */}
        {!isReelsPage && !isChatPage && <Sidebar />}

        {/* Main Content Area - No padding, each page handles its own spacing */}
        <main className={`flex-1 min-h-screen ${(!isReelsPage && !isChatPage) ? 'lg:pl-72' : ''}`}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation - Visible on chat as requested */}
      {!isReelsPage && <MobileNavBar />}

      {/* PWA Install Prompt */}
      {!isReelsPage && <InstallPrompt />}
    </div>
  )
}

export default Layout
