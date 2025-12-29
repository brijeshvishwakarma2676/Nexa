import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Search, Bell, MessageCircle, LogOut, User, Home,
  Play, Store, Users, Gamepad2, Grid3X3, ArrowLeft, X
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useChatStore } from '../stores/chatStore'
import api from '../services/api'
import { formatDistanceToNow } from 'date-fns'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore()
  const { conversations } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  // Calculate total unread messages
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  // Navigation items
  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Play, path: '/videos', label: 'Video' },
    { icon: Users, path: '/groups', label: 'Groups' },
  ]

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search users
  const handleSearch = async (query) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await api.get(`/users/search/${query}`)
      // API returns { users: [...], total: N }
      const users = response.data?.users || response.data || []
      setSearchResults(Array.isArray(users) ? users : [])
      setShowSearch(true)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  // Open notifications
  const handleOpenNotifications = () => {
    if (!showNotifications) {
      fetchNotifications()
    }
    setShowNotifications(!showNotifications)
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    setShowNotifications(false)

    if (notification.post_id) {
      navigate(`/profile/${notification.actor.username}`)
    } else if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor.username}`)
    }
  }

  // Logout
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--color-border)] z-50 shadow-sm">
      <div className="h-full max-w-[1920px] mx-auto px-4 flex lg:items-center justify-between lg:gap-4">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-2 w-[280px]">
          <Link to="/" className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
          </Link>

          {/* Search */}
          <div className="relative flex-1" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search Nexa"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-[var(--color-bg)] border-none text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all"
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-[var(--color-border)] py-2 max-h-[400px] overflow-y-auto animate-fadeIn">
                {/* Header with back button */}
                <div className="flex items-center gap-2 px-3 pb-2 border-b border-[var(--color-border)]">
                  <button
                    onClick={clearSearch}
                    className="p-2 rounded-full hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  </button>
                  <span className="text-sm text-[var(--color-text-muted)]">{searchQuery}</span>
                </div>

                {(!Array.isArray(searchResults) || searchResults.length === 0) ? (
                  <p className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    No results found
                  </p>
                ) : (
                  searchResults.map((result) => (
                    <Link
                      key={result.id}
                      to={`/profile/${result.username}`}
                      onClick={clearSearch}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg)] transition-colors"
                    >
                      <img
                        src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.username}&background=4F46E5&color=fff`}
                        alt={result.username}
                        className="w-9 h-9 rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                          {result.display_name || result.username}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {result.relationship_status || 'User'}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Icons */}
        <div className="flex-1 lg:flex justify-center hidden">
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-8 py-2 rounded-lg transition-colors group ${isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'
                    }`}
                  title={item.label}
                >
                  <Icon className="w-6 h-6" />
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute bottom-[-8px] left-0 right-0 h-[3px] bg-[var(--color-primary)] rounded-t-full" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 w-[280px] justify-end">
          {/* Menu Grid */}
          <button className="p-2.5 rounded-full bg-[var(--color-bg)] hover:bg-gray-200 transition-colors">
            <Grid3X3 className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>

          {/* Messages */}
          <Link
            to="/chat"
            className="relative p-2.5 rounded-full bg-[var(--color-bg)] hover:bg-gray-200 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[var(--color-text-primary)]" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleOpenNotifications}
              className="relative p-2.5 rounded-full bg-[var(--color-bg)] hover:bg-gray-200 transition-colors"
            >
              <Bell className="w-5 h-5 text-[var(--color-text-primary)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[var(--color-border)] py-2 max-h-96 overflow-y-auto animate-fadeIn">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
                  <h3 className="font-bold text-xl">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg)] transition-colors text-left ${!notification.read ? 'bg-[var(--color-primary-light)]' : ''
                        }`}
                    >
                      <img
                        src={notification.actor.avatar_url || `https://ui-avatars.com/api/?name=${notification.actor.username}&background=4F46E5&color=fff`}
                        alt={notification.actor.username}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-primary)]">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-3 h-3 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-2" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="p-0.5 rounded-full hover:opacity-80 transition-opacity"
            >
              <img
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
                alt={user?.username}
                className="w-10 h-10 rounded-full ring-2 ring-transparent hover:ring-[var(--color-primary)] transition-all"
              />
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[var(--color-border)] py-2 animate-fadeIn">
                <Link
                  to={`/profile/${user?.username}`}
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg)] transition-colors"
                >
                  <User className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span>My Profile</span>
                </Link>
                <hr className="my-2 border-[var(--color-border)]" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg)] transition-colors text-[var(--color-error)]"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
