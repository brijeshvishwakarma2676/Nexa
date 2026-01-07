import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import FollowRequests from './pages/FollowRequests'
import FindUsers from './pages/FindUsers'
import Users from './pages/Users'
import { useEffect } from 'react'

import { Loader2 } from 'lucide-react'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialized, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--color-bg)">
        <Loader2 className="w-10 h-10 text-(--color-primary) animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public route wrapper (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, isInitialized, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--color-bg)">
        <Loader2 className="w-10 h-10 text-(--color-primary) animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Feed />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="requests" element={<FollowRequests />} />
          <Route path="search" element={<FindUsers />} />
          <Route path="users" element={<Users />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
