import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Send, Loader2 } from 'lucide-react'
import { formatTimeAgo } from '../utils/dateUtils'
import { useAuthStore } from '../stores/authStore'
import { useFeedStore } from '../stores/feedStore'
import api from '../services/api'

// Redundant local formatter removed

export default function Comments({ postId }) {
  const { user } = useAuthStore()
  const { updatePost } = useFeedStore()

  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await api.get(`/posts/${postId}/comments`)
        setComments(response.data.comments)
      } catch (error) {
        console.error('Failed to load comments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [postId])

  // Submit comment
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!newComment.trim()) return

    setIsSubmitting(true)

    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        content: newComment.trim(),
      })

      setComments([response.data, ...comments])
      setNewComment('')

      // Update post comment count
      updatePost(postId, { comments_count: comments.length + 1 })
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t border-(--color-border)">
      {/* Comment input */}
      <form onSubmit={handleSubmit} className="p-4 flex gap-3">
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
          alt={user?.username}
          className="w-8 h-8 rounded-full avatar flex-shrink-0"
        />
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="btn btn-primary px-3"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-(--color-primary) animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-(--color-text-muted) py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 animate-fadeIn">
              <Link to={`/profile/${comment.author.username}`}>
                <img
                  src={comment.author.avatar_url || `https://ui-avatars.com/api/?name=${comment.author.username}&background=4F46E5&color=fff`}
                  alt={comment.author.username}
                  className="w-8 h-8 rounded-full avatar flex-shrink-0"
                />
              </Link>
              <div className="flex-1">
                <div className="bg-(--color-bg) rounded-2xl px-4 py-2">
                  <Link
                    to={`/profile/${comment.author.username}`}
                    className="font-semibold text-sm text-(--color-text-primary) hover:underline"
                  >
                    {comment.author.display_name || comment.author.username}
                  </Link>
                  <p className="text-(--color-text-primary) text-sm">
                    {comment.content}
                  </p>
                </div>
                <p className="text-xs text-(--color-text-muted) mt-1 ml-4">
                  {formatTimeAgo(comment.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
