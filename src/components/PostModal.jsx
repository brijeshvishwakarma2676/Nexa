import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    X, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
    ChevronLeft, ChevronRight, Send, Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useFeedStore } from '../stores/feedStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

// Format time without "about" prefix
const formatTimeAgo = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
        .replace('about ', '')
        .replace('less than ', '')
}

export default function PostModal({ post, onClose }) {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const { toggleLike, updatePost } = useFeedStore()

    const [comments, setComments] = useState([])
    const [isLoadingComments, setIsLoadingComments] = useState(true)
    const [newComment, setNewComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLiked, setIsLiked] = useState(post.is_liked)
    const [likesCount, setLikesCount] = useState(post.likes_count)
    const [isSaved, setIsSaved] = useState(false)

    // Fetch comments
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const response = await api.get(`/posts/${post.id}/comments`)
                setComments(response.data.comments || [])
            } catch (error) {
                console.error('Failed to load comments:', error)
            } finally {
                setIsLoadingComments(false)
            }
        }
        fetchComments()
    }, [post.id])

    // Keyboard handler
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }, [onClose])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'auto'
        }
    }, [handleKeyDown])

    // Handle like
    const handleLike = async () => {
        setIsLiked(!isLiked)
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
        toggleLike(post.id)
    }

    // Handle comment submit
    const handleSubmitComment = async (e) => {
        e.preventDefault()
        if (!newComment.trim()) return

        setIsSubmitting(true)
        try {
            const response = await api.post(`/posts/${post.id}/comments`, {
                content: newComment.trim()
            })
            setComments([response.data, ...comments])
            setNewComment('')
            updatePost(post.id, { comments_count: (post.comments_count || 0) + 1 })
        } catch (error) {
            console.error('Failed to add comment:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const authorAvatar = post.author.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.display_name || post.author.username)}&size=100&background=4F46E5&color=fff`

    return (
        <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition z-50"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Modal container */}
            <div className="bg-white rounded-lg overflow-hidden max-w-5xl w-full h-[85vh] lg:h-[80vh] flex flex-col lg:flex-row shadow-2xl animate-fadeIn">

                {/* Left side - Image/Content */}
                <div className="lg:w-[60%] bg-gray-100 flex items-center justify-center h-[40vh] lg:h-full">
                    {post.image_url ? (
                        <img
                            src={post.image_url}
                            alt="Post"
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <div className="p-8 text-gray-800 text-center">
                            <p className="text-lg whitespace-pre-wrap">{post.content}</p>
                        </div>
                    )}
                </div>

                {/* Right side - Comments & Info */}
                <div className="lg:w-[40%] flex flex-col bg-white h-[45vh] lg:h-full">

                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-(--color-border)">
                        <Link to={`/profile/${post.author.username}`} onClick={onClose}>
                            <img
                                src={authorAvatar}
                                alt={post.author.username}
                                className="w-10 h-10 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.display_name || post.author.username)}&size=100&background=4F46E5&color=fff`
                                }}
                            />
                        </Link>
                        <div className="flex-1">
                            <Link
                                to={`/profile/${post.author.username}`}
                                onClick={onClose}
                                className="font-semibold text-(--color-text-primary) hover:underline"
                            >
                                {post.author.display_name || post.author.username}
                            </Link>
                            {post.location && (
                                <p className="text-xs text-(--color-text-muted)">{post.location}</p>
                            )}
                        </div>
                        <button className="p-2 hover:bg-(--color-bg) rounded-full transition">
                            <MoreHorizontal className="w-5 h-5 text-(--color-text-muted)" />
                        </button>
                    </div>

                    {/* Comments section - scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Original post caption */}
                        {post.content && post.image_url && (
                            <div className="flex gap-3">
                                <Link to={`/profile/${post.author.username}`} onClick={onClose}>
                                    <img
                                        src={authorAvatar}
                                        alt={post.author.username}
                                        className="w-8 h-8 rounded-full object-cover shrink-0"
                                        referrerPolicy="no-referrer"
                                    />
                                </Link>
                                <div>
                                    <p className="text-sm">
                                        <Link
                                            to={`/profile/${post.author.username}`}
                                            onClick={onClose}
                                            className="font-semibold text-(--color-text-primary) hover:underline mr-2"
                                        >
                                            {post.author.username}
                                        </Link>
                                        <span className="text-(--color-text-secondary)">{post.content}</span>
                                    </p>
                                    <p className="text-xs text-(--color-text-muted) mt-1">
                                        {formatTimeAgo(post.created_at)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Comments list */}
                        {isLoadingComments ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 text-(--color-primary) animate-spin" />
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-(--color-text-muted)">No comments yet.</p>
                                <p className="text-sm text-(--color-text-muted)">Start the conversation.</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <Link to={`/profile/${comment.author.username}`} onClick={onClose}>
                                        <img
                                            src={comment.author.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.username)}&size=100&background=4F46E5&color=fff`}
                                            alt={comment.author.username}
                                            className="w-8 h-8 rounded-full object-cover shrink-0"
                                            referrerPolicy="no-referrer"
                                        />
                                    </Link>
                                    <div className="flex-1">
                                        <p className="text-sm">
                                            <Link
                                                to={`/profile/${comment.author.username}`}
                                                onClick={onClose}
                                                className="font-semibold text-(--color-text-primary) hover:underline mr-2"
                                            >
                                                {comment.author.username}
                                            </Link>
                                            <span className="text-(--color-text-secondary)">{comment.content}</span>
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-(--color-text-muted)">
                                                {formatTimeAgo(comment.created_at)}
                                            </span>
                                            <button className="text-xs font-semibold text-(--color-text-muted) hover:text-(--color-text-secondary)">
                                                Reply
                                            </button>
                                        </div>
                                    </div>
                                    <button className="p-1 hover:text-(--color-text-primary)">
                                        <Heart className="w-3 h-3 text-(--color-text-muted)" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-(--color-border) p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike} className="hover:opacity-70 transition">
                                    <Heart
                                        className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-(--color-text-primary)'}`}
                                    />
                                </button>
                                <button className="hover:opacity-70 transition">
                                    <MessageCircle className="w-6 h-6 text-(--color-text-primary)" />
                                </button>
                                <button className="hover:opacity-70 transition">
                                    <Share2 className="w-6 h-6 text-(--color-text-primary)" />
                                </button>
                            </div>
                            <button
                                onClick={() => setIsSaved(!isSaved)}
                                className="hover:opacity-70 transition"
                            >
                                <Bookmark
                                    className={`w-6 h-6 ${isSaved ? 'fill-current text-(--color-text-primary)' : 'text-(--color-text-primary)'}`}
                                />
                            </button>
                        </div>

                        {/* Likes count */}
                        {likesCount > 0 && (
                            <p className="font-semibold text-sm text-(--color-text-primary) mb-1">
                                {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
                            </p>
                        )}

                        {/* Timestamp */}
                        {/* <p className="text-xs text-(--color-text-muted) uppercase mb-3">
                            {formatTimeAgo(post.created_at)}
                        </p> */}

                        {/* Comment input */}
                        <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="text-(--color-primary) font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
