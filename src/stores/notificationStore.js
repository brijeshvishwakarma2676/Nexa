import { create } from 'zustand'
import api from '../services/api'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Fetch notifications
  fetchNotifications: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.get('/notifications', { params: { limit: 20 } })
      set({
        notifications: response.data.notifications,
        unreadCount: response.data.unread_count,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Failed to load notifications',
        isLoading: false,
      })
    }
  },

  // Fetch unread count only
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/count')
      set({ unreadCount: response.data.unread_count })
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  },

  // Mark single notification as read
  markAsRead: async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`)

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all')

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  },

  // Add real-time notification
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  // Reset store
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
    })
  },
}))
