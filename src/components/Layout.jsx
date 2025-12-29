import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useChatStore } from '../stores/chatStore'
import { useNotificationStore } from '../stores/notificationStore'

export default function Layout() {
  const { connectWebSocket, disconnectWebSocket } = useChatStore()
  const { fetchUnreadCount } = useNotificationStore()

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

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex pt-16">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 ml-0 lg:ml-72 min-h-[calc(100vh-4rem)]">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
