import { useEffect, useRef, useCallback } from 'react'
import { useFeedStore } from '../stores/feedStore'
import { useStoryStore } from '../stores/storyStore'
import StoryBar from '../components/StoryBar'
import CreatePost from '../components/CreatePost'
import Post from '../components/Post'
import StoryViewer from '../components/StoryViewer'
import { Loader2 } from 'lucide-react'

export default function Feed() {
  const { posts, isLoading, hasMore, fetchFeed } = useFeedStore()
  const { storyGroups, fetchStories, viewerOpen } = useStoryStore()

  const observerRef = useRef(null)

  // Initial load
  useEffect(() => {
    fetchFeed(true)
    fetchStories()
  }, [fetchFeed, fetchStories])

  // Infinite scroll observer
  const lastPostRef = useCallback(
    (node) => {
      if (isLoading) return

      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchFeed()
        }
      })

      if (node) {
        observerRef.current.observe(node)
      }
    },
    [isLoading, hasMore, fetchFeed]
  )

  return (
    <div className="space-y-6">
      {/* Stories */}
      <StoryBar />

      {/* Create Post */}
      <CreatePost />

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={index === posts.length - 1 ? lastPostRef : null}
          >
            <Post post={post} />
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && posts.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              No posts yet
            </h3>
            <p className="text-[var(--color-text-muted)]">
              Be the first to share something or follow more people to see their posts!
            </p>
          </div>
        )}

        {/* End of feed */}
        {!isLoading && !hasMore && posts.length > 0 && (
          <p className="text-center text-[var(--color-text-muted)] py-8">
            You've reached the end of your feed
          </p>
        )}
      </div>

      {/* Story Viewer Modal */}
      {viewerOpen && <StoryViewer />}
    </div>
  )
}
