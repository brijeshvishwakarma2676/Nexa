import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, MoreHorizontal, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useFeedStore } from '../stores/feedStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import Comments from './Comments'

export default function Post({ post }) {
  const { user } = useAuthStore()
  const { toggleLike, removePost } = useFeedStore()

  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)

  const isOwner = user?.id === post.author.id

  const handleLike = () => {
    toggleLike(post.id)
  }

  const handleFollow = async () => {
    try {
      await api.post(`/users/${post.author.id}/follow`)
      setIsFollowing(true)
    } catch (error) {
      console.error('Failed to follow:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await api.delete(`/posts/${post.id}`)
      removePost(post.id)
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  return (
    <article className="card overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <Link to={`/profile/${post.author.username}`}>
            <img
              src={post.author.avatar_url || `https://ui-avatars.com/api/?name=${post.author.username}&background=4F46E5&color=fff`}
              alt={post.author.username}
              className="w-11 h-11 rounded-full avatar hover:opacity-90 transition-opacity"
            />
          </Link>
          <div>
            <Link
              to={`/profile/${post.author.username}`}
              className="font-semibold text-[var(--color-text-primary)] hover:underline"
            >
              {post.author.display_name || post.author.username}
            </Link>
            <p className="text-sm text-[var(--color-text-muted)]">
              @{post.author.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-[var(--color-bg)] transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 card py-1 z-10 animate-fadeIn">
              {!isOwner && !isFollowing && (
                <button
                  onClick={() => {
                    handleFollow()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--color-bg)] transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Follow @{post.author.username}
                </button>
              )}
              {isOwner && (
                <button
                  onClick={() => {
                    handleDelete()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-error)] hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[var(--color-text-primary)] whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="border-t border-b border-[var(--color-border)]">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full max-h-[500px] object-cover"
          />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
        {post.likes_count > 0 && (
          <span>{post.likes_count} like{post.likes_count !== 1 ? 's' : ''}</span>
        )}
        {post.comments_count > 0 && (
          <span>{post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] flex gap-2">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${post.is_liked
              ? 'text-[var(--color-secondary)] bg-[var(--color-secondary)]/10'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
            }`}
        >
          <Heart
            className={`w-5 h-5 ${post.is_liked ? 'fill-current animate-heartBeat' : ''}`}
          />
          <span className="font-medium">Like</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${showComments
              ? 'text-[var(--color-primary)] bg-[var(--color-primary-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
            }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Comment</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && <Comments postId={post.id} />}
    </article>
  )
}
