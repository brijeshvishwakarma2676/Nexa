import { create } from 'zustand'
import api from '../services/api'

/**
 * Friend Request Store
 * Manages friend requests and user search with relationship states
 */
export const useFollowStore = create((set, get) => ({
  // Search state
  searchResults: [],
  searchLoading: false,
  searchError: null,

  // Incoming requests state
  incomingRequests: [],
  sentRequests: [],
  requestsLoading: false,
  requestsError: null,

  // Search users with relationship status
  searchUsers: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }

    set({ searchLoading: true, searchError: null })
    try {
      const response = await api.get(`/users/search/${encodeURIComponent(query)}`)
      set({ searchResults: response.data.users, searchLoading: false })
    } catch (error) {
      set({
        searchError: error.response?.data?.detail || 'Search failed',
        searchLoading: false
      })
    }
  },

  clearSearch: () => set({ searchResults: [], searchError: null }),

  // Send friend request
  followUser: async (userId) => {
    try {
      const response = await api.post(`/users/${userId}/follow`)

      // Update search results
      set((state) => ({
        searchResults: state.searchResults.map((user) =>
          user.id === userId
            ? { ...user, relationship_status: response.data.relationship_status }
            : user
        )
      }))

      // Refresh sent requests
      get().fetchSentRequests()

      return response.data
    } catch (error) {
      throw error
    }
  },

  // Cancel request or unfriend
  unfollowUser: async (userId) => {
    try {
      const response = await api.delete(`/users/${userId}/follow`)

      // Update search results
      set((state) => ({
        searchResults: state.searchResults.map((user) =>
          user.id === userId
            ? { ...user, relationship_status: 'none' }
            : user
        )
      }))

      // Refresh sent requests
      get().fetchSentRequests()

      return response.data
    } catch (error) {
      throw error
    }
  },

  // Get incoming friend requests
  fetchIncomingRequests: async () => {
    set({ requestsLoading: true, requestsError: null })
    try {
      const response = await api.get('/users/requests/incoming')
      set({
        incomingRequests: response.data.requests,
        requestsLoading: false
      })
    } catch (error) {
      set({
        requestsError: error.response?.data?.detail || 'Failed to load requests',
        requestsLoading: false
      })
    }
  },

  // Get sent friend requests
  fetchSentRequests: async () => {
    try {
      const response = await api.get('/users/requests/sent')
      set({ sentRequests: response.data.requests })
    } catch (error) {
      console.error('Failed to fetch sent requests:', error)
    }
  },

  // Accept friend request (creates mutual friendship)
  acceptRequest: async (requestId) => {
    try {
      await api.post(`/users/requests/${requestId}/accept`)

      // Remove from list
      set((state) => ({
        incomingRequests: state.incomingRequests.filter(r => r.id !== requestId)
      }))

      return true
    } catch (error) {
      throw error
    }
  },

  // Reject friend request (deletes from DB)
  rejectRequest: async (requestId) => {
    try {
      await api.delete(`/users/requests/${requestId}`)

      // Remove from list
      set((state) => ({
        incomingRequests: state.incomingRequests.filter(r => r.id !== requestId)
      }))

      return true
    } catch (error) {
      throw error
    }
  },

  // Cancel sent request
  cancelRequest: async (requestId) => {
    try {
      await api.delete(`/users/requests/${requestId}/cancel`)

      // Remove from list
      set((state) => ({
        sentRequests: state.sentRequests.filter(r => r.id !== requestId)
      }))

      return true
    } catch (error) {
      throw error
    }
  },

  // Reset store
  reset: () => set({
    searchResults: [],
    searchLoading: false,
    searchError: null,
    incomingRequests: [],
    sentRequests: [],
    requestsLoading: false,
    requestsError: null
  })
}))
