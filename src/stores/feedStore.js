import { create } from 'zustand'
import api from '../services/api'

export const useFeedStore = create((set, get) => ({
  posts: [],
  isLoading: false,
  hasMore: true,
  cursor: null,
  error: null,

  // Fetch feed with infinite scroll
  fetchFeed: async (reset = false) => {
    const { isLoading, hasMore, cursor } = get()

    if (isLoading || (!hasMore && !reset)) return

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

  // Reset store
  reset: () => {
    set({ posts: [], isLoading: false, hasMore: true, cursor: null, error: null })
  },
}))
