import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Search, Bell, MessageCircle, LogOut, User, Home,
  Play, Store, Users, Gamepad2, Grid3X3, ArrowLeft, X, Loader2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useChatStore } from '../stores/chatStore'
import api from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import logo from '../assets/nexa_logo.png'
import { UserPlus } from 'lucide-react'
import LogoutModal from './LogoutModal'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, isLoading: notificationsLoading } = useNotificationStore()
  const { conversations } = useChatStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  // Calculate total unread messages
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  // Navigation items
  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Play, path: '/reels', label: 'Reels' },
    { icon: Users, path: '/users', label: 'Users' },
    { icon: MessageCircle, path: '/chat', label: 'Chat' },
    { icon: UserPlus, path: '/requests', label: 'Requests' },
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
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    setShowLogoutModal(false)
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-(--color-border) z-50 shadow-sm">
      <div className="h-full max-w-[1920px] mx-auto px-4 flex lg:items-center justify-between lg:gap-4">
        {/* Left: Logo + Search */}
        <div className="flex items-center gap-2 w-[280px]">
          <Link to="/" className="shrink-0">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
          </Link>

          {/* Search */}
          <div className="relative flex-1" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search Nexa"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-(--color-bg) text-sm focus:ring-2 focus:ring-(--color-primary) focus:bg-white transition-all border border-(--color-border)"
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-(--color-border) py-2 max-h-[600px] w-[280px] overflow-y-auto animate-fadeIn">
                {/* Header with back button */}
                <div className="flex items-center gap-2 px-3 pb-2 border-b border-(--color-border)">
                  <button
                    onClick={clearSearch}
                    className="p-2 rounded-full hover:bg-(--color-bg) transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-(--color-text-secondary)" />
                  </button>
                  <span className="text-sm text-(--color-text-muted)">{searchQuery}</span>
                </div>

                {(!Array.isArray(searchResults) || searchResults.length === 0) ? (
                  <p className="px-4 py-6 text-center text-(--color-text-muted)">
                    No results found
                  </p>
                ) : (
                  searchResults.map((result) => (
                    <Link
                      key={result.id}
                      to={`/profile/${result.username}`}
                      onClick={clearSearch}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-(--color-bg) transition-colors"
                    >
                      <img
                        src={result.avatar_url || `https://ui-avatars.com/api/?name=${result.username}&background=4F46E5&color=fff`}
                        alt={result.username}
                        className="w-9 h-9 rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-(--color-text-primary) text-sm">
                          {result.display_name || result.username}
                        </p>
                        <p className="text-xs text-(--color-text-muted)">
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
                    ? 'text-(--color-primary)'
                    : 'text-(--color-text-muted) hover:bg-(--color-bg)'
                    }`}
                  title={item.label}
                >
                  <Icon className="w-6 h-6" />
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute bottom-[-8px] left-0 right-0 h-[3px] bg-(--color-primary) rounded-t-full" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 w-[280px] justify-end">
          {/* Menu Grid */}
          <button className="p-2.5 rounded-full bg-(--color-bg) hover:bg-gray-200 transition-colors">
            <Grid3X3 className="w-5 h-5 text-(--color-text-primary)" />
          </button>

          {/* Messages */}
          <Link
            to="/chat"
            className="relative p-2.5 rounded-full bg-(--color-bg) hover:bg-gray-200 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-(--color-text-primary)" />
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
              className="relative p-2.5 rounded-full bg-(--color-bg) hover:bg-gray-200 transition-colors"
            >
              <Bell className="w-5 h-5 text-(--color-text-primary)" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-(--color-border) py-2 max-h-96 overflow-y-auto animate-fadeIn">
                <div className="flex items-center justify-between px-4 py-2 border-b border-(--color-border)">
                  <h3 className="font-bold text-xl">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-(--color-primary) hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-(--color-primary) animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-(--color-text-muted)">
                    No notifications yet
                  </p>
                ) : (
                  <>
                    {notifications.slice(0, 4).map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-(--color-bg) transition-colors text-left ${!notification.read ? 'bg-(--color-primary-light)' : ''
                          }`}
                      >
                        <img
                          src={notification.actor.avatar_url || `https://ui-avatars.com/api/?name=${notification.actor.username}&background=4F46E5&color=fff`}
                          alt={notification.actor.username}
                          className="w-10 h-10 rounded-full shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-(--color-text-primary)">
                            {notification.message}
                          </p>
                          <p className="text-xs text-(--color-text-muted) mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-3 h-3 rounded-full bg-(--color-primary) shrink-0 mt-2" />
                        )}
                      </button>
                    ))}

                    {/* View All Button */}
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block w-full px-4 py-3 text-center text-(--color-primary) font-medium hover:bg-(--color-bg) transition-colors border-t border-(--color-border)"
                    >
                      View all notifications
                    </Link>
                  </>
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
                className="w-10 h-10 rounded-full ring-2 ring-transparent hover:ring-(--color-primary) transition-all"
              />
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-(--color-border) overflow-hidden animate-fadeIn z-50">
                {/* User Card */}
                <div className="p-4">
                  <Link
                    to={`/profile/${user?.username}`}
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-(--color-bg) transition-colors"
                  >
                    <img
                      src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
                      alt={user?.username}
                      className="w-12 h-12 rounded-full ring-2 ring-(--color-border)"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-(--color-text-primary) truncate">
                        {user?.display_name || user?.username}
                      </p>
                      <p className="text-sm text-(--color-text-muted) truncate">@{user?.username}</p>
                    </div>
                  </Link>

                  {/* See Profile Button */}
                  <Link
                    to={`/profile/${user?.username}`}
                    onClick={() => setShowProfile(false)}
                    className="block w-full mt-2 py-2 px-4 bg-(--color-bg) hover:bg-gray-200 rounded-lg text-center text-sm font-medium text-(--color-primary) transition-colors"
                  >
                    See your profile
                  </Link>
                </div>

                <hr className="border-(--color-border)" />

                {/* Menu Items */}
                <div className="p-2">
                  <button
                    onClick={() => setShowSettingsMenu(true)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                        <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="font-medium text-(--color-text-primary)">Settings & privacy</span>
                    </div>
                    <svg className="w-5 h-5 text-(--color-text-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Settings & Privacy Submenu */}
                  {showSettingsMenu && (
                    <div className="absolute inset-0 bg-(--color-card) rounded-xl animate-slideIn z-10">
                      {/* Header with back button */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--color-border)">
                        <button
                          onClick={() => setShowSettingsMenu(false)}
                          className="w-9 h-9 rounded-full bg-(--color-bg) hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5 text-(--color-text-primary)" />
                        </button>
                        <h3 className="text-xl font-bold text-(--color-text-primary)">Settings & privacy</h3>
                      </div>

                      {/* Settings Menu Items */}
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => { setShowSettingsMenu(false); setShowProfile(false); navigate('/profile/' + user?.username); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                            <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <span className="font-medium text-(--color-text-primary)">Settings</span>
                        </button>

                        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                              <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="font-medium text-(--color-text-primary)">Language</span>
                          </div>
                          <svg className="w-5 h-5 text-(--color-text-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors">
                          <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                            <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <span className="font-medium text-(--color-text-primary)">Privacy Checkup</span>
                        </button>

                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors">
                          <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                            <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <span className="font-medium text-(--color-text-primary)">Privacy Centre</span>
                        </button>

                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors">
                          <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                            <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </div>
                          <span className="font-medium text-(--color-text-primary)">Activity log</span>
                        </button>

                        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors">
                          <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                            <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                          </div>
                          <span className="font-medium text-(--color-text-primary)">Content preferences</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <Link
                    to="/help"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                        <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="font-medium text-(--color-text-primary)">Help & support</span>
                    </div>
                    <svg className="w-5 h-5 text-(--color-text-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <button
                    onClick={() => { /* Toggle dark mode */ }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                        <svg className="w-5 h-5 text-(--color-text-primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <span className="font-medium text-(--color-text-primary)">Display & accessibility</span>
                    </div>
                    <svg className="w-5 h-5 text-(--color-text-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-(--color-bg) transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-(--color-bg) flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-(--color-text-primary)" />
                    </div>
                    <span className="font-medium text-(--color-text-primary)">Log out</span>
                  </button>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-(--color-bg)">
                  <p className="text-xs text-(--color-text-muted) flex flex-wrap gap-1">
                    <a href="/privacy" className="hover:underline">Privacy</a> ·
                    <a href="/terms" className="hover:underline">Terms</a> ·
                    <a href="/cookies" className="hover:underline">Cookies</a> ·
                    <span>Nexa © 2024</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </nav>
  )
}
