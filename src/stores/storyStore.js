import { create } from 'zustand'
import api from '../services/api'

export const useStoryStore = create((set, get) => ({
  storyGroups: [],
  isLoading: false,
  error: null,
  lastFetchTime: null,
  CACHE_DURATION: 120 * 1000, // 2 minutes cache

  // Currently viewing
  viewerOpen: false,
  currentGroupIndex: 0,
  currentStoryIndex: 0,

  // Fetch all stories
  fetchStories: async (force = false) => {
    const { isLoading, lastFetchTime, CACHE_DURATION } = get()

    if (isLoading) return

    if (!force && lastFetchTime) {
      const timeSinceLastFetch = Date.now() - lastFetchTime
      if (timeSinceLastFetch < CACHE_DURATION) {
        return // Use cache
      }
    }

    set({ isLoading: true, error: null })

    try {
      const response = await api.get('/stories')
      set({ 
        storyGroups: response.data.story_groups, 
        isLoading: false,
        lastFetchTime: Date.now()
      })
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Failed to load stories',
        isLoading: false
      })
    }
  },

  // Open story viewer at specific group
  openViewer: (groupIndex) => {
    set({
      viewerOpen: true,
      currentGroupIndex: groupIndex,
      currentStoryIndex: 0,
    })
  },

  // Close viewer
  closeViewer: () => {
    set({
      viewerOpen: false,
      currentGroupIndex: 0,
      currentStoryIndex: 0,
    })
  },

  // Go to next story
  nextStory: () => {
    const { storyGroups, currentGroupIndex, currentStoryIndex } = get()
    const currentGroup = storyGroups[currentGroupIndex]

    if (!currentGroup) {
      get().closeViewer()
      return
    }

    // Mark current story as viewed (in background)
    const currentStory = currentGroup.stories[currentStoryIndex]
    if (currentStory && !currentStory.is_viewed) {
      api.get(`/stories/${currentStory.id}`).then(() => {
        set((state) => ({
          storyGroups: state.storyGroups.map((group, gi) =>
            gi === currentGroupIndex
              ? {
                ...group,
                stories: group.stories.map((story, si) =>
                  si === currentStoryIndex ? { ...story, is_viewed: true } : story
                ),
              }
              : group
          ),
        }))
      }).catch(err => console.error('Failed to mark story as viewed:', err))
    }

    // Check if more stories in current group
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      set({ currentStoryIndex: currentStoryIndex + 1 })
      return
    }

    // Move to next group
    if (currentGroupIndex < storyGroups.length - 1) {
      set({
        currentGroupIndex: currentGroupIndex + 1,
        currentStoryIndex: 0,
      })
      return
    }

    // All stories viewed - close
    get().closeViewer()
  },

  // Go to previous story
  prevStory: () => {
    const { storyGroups, currentGroupIndex, currentStoryIndex } = get()

    // Check if can go back in current group
    if (currentStoryIndex > 0) {
      set({ currentStoryIndex: currentStoryIndex - 1 })
      return
    }

    // Move to previous group
    if (currentGroupIndex > 0) {
      const prevGroup = storyGroups[currentGroupIndex - 1]
      set({
        currentGroupIndex: currentGroupIndex - 1,
        currentStoryIndex: prevGroup.stories.length - 1,
      })
    }
  },

  // Add new story
  addStory: (story, user) => {
    set((state) => {
      const existingGroupIndex = state.storyGroups.findIndex(
        (g) => g.user.id === user.id
      )

      if (existingGroupIndex >= 0) {
        // Add to existing group
        const updated = [...state.storyGroups]
        updated[existingGroupIndex] = {
          ...updated[existingGroupIndex],
          stories: [story, ...updated[existingGroupIndex].stories],
          latest_story_at: story.created_at,
        }
        return { storyGroups: updated }
      }

      // Create new group at beginning
      return {
        storyGroups: [
          {
            user,
            stories: [story],
            all_seen: true,
            latest_story_at: story.created_at,
          },
          ...state.storyGroups,
        ],
      }
    })
  },

  // Get current story for viewer
  getCurrentStory: () => {
    const { storyGroups, currentGroupIndex, currentStoryIndex } = get()
    const group = storyGroups[currentGroupIndex]
    return group?.stories[currentStoryIndex] || null
  },

  // Get current group for viewer
  getCurrentGroup: () => {
    const { storyGroups, currentGroupIndex } = get()
    return storyGroups[currentGroupIndex] || null
  },
}))
