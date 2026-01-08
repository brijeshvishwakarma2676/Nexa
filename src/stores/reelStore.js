import { create } from 'zustand'
import api from '../services/api'

export const useReelStore = create((set, get) => ({
    reels: [],
    currentIndex: 0,
    isLoading: false,
    hasMore: true,
    nextCursor: null,
    error: null,

    // Fetch reels feed
    fetchReels: async (refresh = false) => {
        const { isLoading, hasMore, nextCursor } = get()
        
        if (isLoading || (!refresh && !hasMore)) return
        
        set({ isLoading: true, error: null })
        
        try {
            const params = { limit: 10 }
            if (!refresh && nextCursor) {
                params.cursor = nextCursor
            }
            
            const response = await api.get('/reels/feed', { params })
            const { reels: newReels, next_cursor, has_more } = response.data
            
            set(state => ({
                reels: refresh ? newReels : [...state.reels, ...newReels],
                nextCursor: next_cursor,
                hasMore: has_more,
                isLoading: false
            }))
        } catch (error) {
            set({
                error: error.response?.data?.detail || 'Failed to load reels',
                isLoading: false
            })
        }
    },

    // Set current reel index
    setCurrentIndex: (index) => set({ currentIndex: index }),

    // Toggle like on a reel
    toggleLike: async (reelId) => {
        const { reels } = get()
        const reel = reels.find(r => r.id === reelId)
        if (!reel) return

        // Optimistic update
        set(state => ({
            reels: state.reels.map(r =>
                r.id === reelId
                    ? {
                        ...r,
                        is_liked: !r.is_liked,
                        likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1
                    }
                    : r
            )
        }))

        try {
            if (reel.is_liked) {
                await api.delete(`/reels/${reelId}/like`)
            } else {
                await api.post(`/reels/${reelId}/like`)
            }
        } catch (error) {
            // Revert on error
            set(state => ({
                reels: state.reels.map(r =>
                    r.id === reelId
                        ? {
                            ...r,
                            is_liked: !r.is_liked,
                            likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1
                        }
                        : r
                )
            }))
        }
    },

    // Increment view count
    incrementView: async (reelId) => {
        try {
            await api.post(`/reels/${reelId}/view`)
            set(state => ({
                reels: state.reels.map(r =>
                    r.id === reelId
                        ? { ...r, views_count: (r.views_count || 0) + 1 }
                        : r
                )
            }))
        } catch (error) {
            console.error('Failed to increment view:', error)
        }
    },

    // Add a new reel (after upload)
    addReel: (reel) => {
        set(state => ({
            reels: [reel, ...state.reels]
        }))
    },

    // Reset store
    reset: () => set({
        reels: [],
        currentIndex: 0,
        isLoading: false,
        hasMore: true,
        nextCursor: null,
        error: null
    })
}))
