import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ThumbsUp, MessageCircle, Share2, MoreHorizontal, X,
  Globe, Users as UsersIcon, Trash2, UserPlus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useFeedStore } from '../stores/feedStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import Comments from './Comments'

const MAX_CONTENT_LENGTH = 200

// Format time without "about" prefix
const formatTimeAgo = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
    .replace('about ', '')
    .replace('less than ', '')
}

export default function Post({ post }) {
  const { user } = useAuthStore()
  const { toggleLike, removePost, sharePost } = useFeedStore()

  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(post.relationship_status || 'none')
  const [isSharing, setIsSharing] = useState(false)

  const isOwner = user?.id === post.author.id
  const shouldTruncate = post.content?.length > MAX_CONTENT_LENGTH && !isExpanded
  const displayContent = shouldTruncate
    ? post.content.slice(0, MAX_CONTENT_LENGTH) + '...'
    : post.content

  const handleLike = () => {
    toggleLike(post.id)
  }

  const handleFollow = async () => {
    try {
      const response = await api.post(`/users/${post.author.id}/follow`)
      setCurrentStatus(response.data.relationship_status)
    } catch (error) {
      console.error('Failed to follow:', error)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    try {
      await sharePost(post.id)
    } catch (error) {
      console.error('Failed to share:', error)
    } finally {
      setIsSharing(false)
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

  const handleHidePost = () => {
    removePost(post.id)
    setShowMenu(false)
  }

  // Format large numbers
  const formatCount = (count) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count
  }

  return (
    <article className="bg-white rounded-lg shadow-sm border border-(--color-border) overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-3 flex items-start justify-between">
        <div className="flex gap-3">
          <Link to={`/profile/${post.author.username}`}>
            <img
              src={post.author.avatar_url || `https://ui-avatars.com/api/?name=${post.author.username}&background=4F46E5&color=fff`}
              alt={post.author.username}
              className="w-10 h-10 rounded-full hover:opacity-90 transition-opacity"
            />
          </Link>
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <Link
                to={`/profile/${post.author.username}`}
                className="font-semibold text-(--color-text-primary) hover:underline text-[15px]"
              >
                {post.author.display_name || post.author.username}
              </Link>
              {!isOwner && currentStatus === 'none' && (
                <>
                  <span className="text-(--color-text-muted)">·</span>
                  <button
                    onClick={handleFollow}
                    className="text-(--color-primary) font-semibold text-[15px] hover:underline"
                  >
                    Follow
                  </button>
                </>
              )}
              {!isOwner && currentStatus === 'pending_sent' && (
                <>
                  <span className="text-(--color-text-muted)">·</span>
                  <span className="text-(--color-text-muted) font-medium text-[14px]">Requested</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-(--color-text-muted)">
              <span>{formatTimeAgo(post.created_at)}</span>
              <span>·</span>
              {post.visibility === 'public' ? (
                <Globe className="w-3 h-3" title="Public" />
              ) : (
                <UsersIcon className="w-3 h-3" title="Friends only" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Menu button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-(--color-bg) transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-(--color-text-muted)" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-(--color-border) py-1 z-10 animate-fadeIn">
                {!isOwner && currentStatus === 'none' && (
                  <button
                    onClick={() => {
                      handleFollow()
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-(--color-bg) transition-colors"
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
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-(--color-error) hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete post
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Close/Hide button */}
          <button
            onClick={handleHidePost}
            className="p-2 rounded-full hover:bg-(--color-bg) transition-colors"
            title="Hide post"
          >
            <X className="w-5 h-5 text-(--color-text-muted)" />
          </button>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-(--color-text-primary) whitespace-pre-wrap text-[15px]">
            {displayContent}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-(--color-text-muted) hover:underline font-medium mt-1"
            >
              See more
            </button>
          )}
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="border-t border-(--color-border)">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full max-h-[600px] object-cover"
          />
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-4 py-2 flex items-center justify-between text-sm text-(--color-text-muted)">
        {/* Reactions */}
        <div className="flex items-center gap-1">
          {post.likes_count > 0 && (
            <>
              <div className="flex -space-x-1">
                <span className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center text-[10px]">👍</span>
                <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-[10px]">❤️</span>
              </div>
              <span className="ml-1">{formatCount(post.likes_count)}</span>
            </>
          )}
        </div>

        {/* Comments & Shares */}
        <div className="flex items-center gap-3">
          {post.comments_count > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {formatCount(post.comments_count)} comment{post.comments_count !== 1 ? 's' : ''}
            </button>
          )}
          {post.shares_count > 0 && (
            <span>{formatCount(post.shares_count)} share{post.shares_count !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-3 py-1 border-t border-(--color-border) flex">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors font-medium ${post.is_liked
            ? 'text-(--color-primary)'
            : 'text-(--color-text-secondary) hover:bg-(--color-bg)'
            }`}
        >
          <ThumbsUp
            className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`}
          />
          <span>Like</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors font-medium ${showComments
            ? 'text-(--color-primary)'
            : 'text-(--color-text-secondary) hover:bg-(--color-bg)'
            }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors font-medium text-(--color-text-secondary) hover:bg-(--color-bg) disabled:opacity-50"
        >
          <Share2 className="w-5 h-5" />
          <span>{isSharing ? 'Sharing...' : 'Share'}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && <Comments postId={post.id} />}
    </article>
  )
}
