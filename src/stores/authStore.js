import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Check if user is authenticated on app load
  checkAuth: () => {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, isAuthenticated: true })
      } catch {
        set({ user: null, isAuthenticated: false })
      }
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

  // Register
  register: async (email, username, password) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/signup', { email, username, password })
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

  // Google Login
  googleLogin: async (token) => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.post('/auth/google', { token })
      const { user, access_token, refresh_token } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(user))

      set({ user, isAuthenticated: true, isLoading: false })
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.detail || 'Google login failed'
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
