import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useFeedStore = create(
  persist(
    (set, get) => ({
      posts: [],
      isLoading: false,
      hasMore: true,
      cursor: null,
      error: null,
      lastFetchTime: null, // Track when feed was last loaded
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache

      // Fetch feed with infinite scroll and caching
      fetchFeed: async (reset = false, force = false) => {
        const { isLoading, hasMore, cursor, lastFetchTime, CACHE_DURATION } = get()

        // Don't fetch if already loading
        if (isLoading) return

        // Don't fetch more if no more posts and not resetting
        if (!hasMore && !reset) return

        // If not forcing and not resetting, check cache validity
        if (!force && !reset && lastFetchTime) {
          const timeSinceLastFetch = Date.now() - lastFetchTime
          if (timeSinceLastFetch < CACHE_DURATION) {
            console.log('📦 Using cached feed data')
            return // Use cached data
          }
        }

        set({ isLoading: true, error: null })

        if (reset) {
          set({ posts: [], cursor: null, hasMore: true })
        }

        try {
          const params = { limit: 10 }
          if (!reset && cursor) {
            params.cursor = cursor
          }

          const response = await api.get('/posts/feed', { params })
          const { posts, next_cursor, has_more } = response.data

          set((state) => ({
            posts: reset ? posts : [...state.posts, ...posts],
            cursor: next_cursor,
            hasMore: has_more,
            isLoading: false,
            lastFetchTime: reset ? Date.now() : state.lastFetchTime,
          }))
        } catch (error) {
          set({
            error: error.response?.data?.detail || 'Failed to load feed',
            isLoading: false
          })
        }
      },

      // Add new post to top of feed
      addPost: (post) => {
        set((state) => ({
          posts: [post, ...state.posts],
        }))
      },

      // Update post in feed (for likes, comments)
      updatePost: (postId, updates) => {
        set((state) => ({
          posts: state.posts.map((post) =>
            post.id === postId ? { ...post, ...updates } : post
          ),
        }))
      },

      // Remove post from feed
      removePost: (postId) => {
        set((state) => ({
          posts: state.posts.filter((post) => post.id !== postId),
        }))
      },

      // Like/unlike post
      toggleLike: async (postId) => {
        const post = get().posts.find((p) => p.id === postId)
        if (!post) return

        const wasLiked = post.is_liked

        // Optimistic update
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? {
                ...p,
                is_liked: !wasLiked,
                likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
              }
              : p
          ),
        }))

        try {
          if (wasLiked) {
            await api.delete(`/posts/${postId}/like`)
          } else {
            await api.post(`/posts/${postId}/like`)
          }
        } catch (error) {
          // Revert on error
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId
                ? {
                  ...p,
                  is_liked: wasLiked,
                  likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1,
                }
                : p
            ),
          }))
        }
      },

      // Share post
      sharePost: async (postId) => {
        const post = get().posts.find((p) => p.id === postId)
        if (!post) return

        // Optimistic update
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, shares_count: (p.shares_count || 0) + 1 }
              : p
          ),
        }))

        try {
          await api.post(`/posts/${postId}/share`)
        } catch (error) {
          // Revert on error
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId
                ? { ...p, shares_count: Math.max(0, (p.shares_count || 1) - 1) }
                : p
            ),
          }))
          throw error
        }
      },

      // Reset store
      reset: () => {
        set({ posts: [], isLoading: false, hasMore: true, cursor: null, error: null, lastFetchTime: null })
      },
    }),
    {
      name: 'feed-storage', // unique name for localStorage
      partialize: (state) => ({
        // Only persist the most recent 50 posts to keep the app lightweight
        posts: state.posts.slice(0, 50),
        cursor: state.posts.length > 50 ? null : state.cursor, // Reset cursor if we cut the feed
        hasMore: state.posts.length > 50 ? true : state.hasMore,
        lastFetchTime: state.lastFetchTime
      }),
    }
  )
)
