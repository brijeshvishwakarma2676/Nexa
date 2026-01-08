import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,  // Tracks if auth check has completed
  isLoading: false,
  error: null,

  // Check if user is authenticated on app load
  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')

    // No tokens at all - not authenticated
    if (!token && !refreshToken) {
      set({ user: null, isAuthenticated: false, isInitialized: true })
      return
    }

    // Try to validate with server (interceptor will auto-refresh if needed)
    try {
      const response = await api.get('/auth/me')
      const user = response.data
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, isAuthenticated: true, isInitialized: true })
    } catch (error) {
      // Refresh failed or user doesn't exist - clear everything
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      set({ user: null, isAuthenticated: false, isInitialized: true })
    }
  },

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, access_token, refresh_token } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(user))

      set({ user, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // Register (atomic - all data at once)
  register: async (email, username, password, displayName, birthday) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/signup', {
        email,
        username,
        password,
        display_name: displayName,
        birthday // Format: YYYY-MM-DD
      })
      const { user, access_token, refresh_token } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(user))

      set({ user, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // Check email availability (POST to avoid URL leaks)
  checkEmail: async (email) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/check-email', { email })
      set({ isLoading: false })
      return { available: response.data.available }
    } catch (error) {
      set({ isLoading: false })
      return { available: false, error: error.response?.data?.detail }
    }
  },

  // Check username availability
  checkUsername: async (username) => {
    // We don't necessarily want to set global isLoading for debounced checks
    // as it might flicker the UI, but for an explicit "Next" button we might.
    // For now, let's keep it sync with the store if explicitly requested.
    set({ isLoading: true })
    try {
      const response = await api.post('/auth/check-username', { username })
      set({ isLoading: false })
      return {
        available: response.data.available,
        suggestions: response.data.suggestions || []
      }
    } catch (error) {
      set({ isLoading: false })
      return { available: false, suggestions: [] }
    }
  },

  // Google Verify - check if user exists or needs to complete signup
  googleVerify: async (token) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/google/verify', { token })
      const data = response.data

      if (!data.is_new_user) {
        // Existing user - log them in
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        set({ user: data.user, isAuthenticated: true, isLoading: false })
        return { success: true, isNewUser: false }
      }

      // New user - return data for completing signup
      set({ isLoading: false })
      return {
        success: true,
        isNewUser: true,
        googleData: data.google_data,
        suggestedUsername: data.suggested_username
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Google verification failed'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // Google Signup - complete registration with birthday and username
  googleSignup: async (token, birthday, username) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/google/signup', {
        token,
        birthday, // Format: YYYY-MM-DD
        username
      })
      const { user, access_token, refresh_token } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(user))

      set({ user, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Google signup failed'
      set({ error: message, isLoading: false })
      return { success: false, error: message }
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
  },

  // Update user profile in store
  updateUser: (userData) => {
    const currentUser = get().user
    const updatedUser = { ...currentUser, ...userData }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    set({ user: updatedUser })
  },

  // Clear error
  clearError: () => set({ error: null }),
}))
