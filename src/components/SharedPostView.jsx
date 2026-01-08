import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import api from '../services/api'
import PostModal from './PostModal'

export default function SharedPostView({ postId, isMine }) {
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await api.get(`/posts/${postId}`)
                setPost(response.data)
            } catch (err) {
                console.error('Failed to fetch shared post:', err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }
        fetchPost()
    }, [postId])

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-2 min-w-[200px]">
                <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                <span className="text-sm opacity-50">Loading shared post...</span>
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="py-2 text-sm opacity-50 italic">
                Post unavailable
            </div>
        )
    }

    return (
        <>
            <div 
                onClick={() => setShowModal(true)}
                className={`block overflow-hidden rounded-xl border transition-all hover:brightness-95 active:scale-[0.98] my-1 shadow-sm cursor-pointer ${
                    isMine 
                        ? 'bg-white border-white/40 ring-1 ring-black/5' 
                        : 'bg-white border-gray-100 ring-1 ring-black/5'
                }`}
                style={{ 
                    width: '100%',
                    maxWidth: '280px',
                    minWidth: '200px'
                }}
            >
                <div className="flex flex-col text-gray-800">
                    {/* Header: Author */}
                    <div className="flex items-center gap-2 p-2 border-b border-gray-50 bg-gray-50/50">
                        <img 
                            src={post.author.avatar_url || `https://ui-avatars.com/api/?name=${post.author.username}&background=4F46E5&color=fff`} 
                            className="w-5 h-5 rounded-full object-cover shadow-xs"
                            alt=""
                        />
                        <span className="text-[11px] font-bold truncate opacity-80">
                            {post.author.display_name || post.author.username}
                        </span>
                    </div>

                    {/* Body: Image + Content */}
                    <div className="flex gap-2.5 p-2.5">
                        {post.image_url && (
                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100 shadow-inner">
                                <img 
                                    src={post.image_url} 
                                    className="w-full h-full object-cover"
                                    alt=""
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-[11px] line-clamp-3 leading-snug font-medium opacity-90">
                                {post.content || 'View post'}
                            </p>
                        </div>
                    </div>

                    {/* Footer Link Style */}
                    <div className={`text-[9px] font-extrabold uppercase tracking-widest p-1.5 text-center border-t border-gray-50 bg-gray-50/30 text-gray-400`}>
                        View Post
                    </div>
                </div>
            </div>

            {showModal && (
                <PostModal 
                    post={post} 
                    onClose={() => setShowModal(false)} 
                />
            )}
        </>
    )
}
