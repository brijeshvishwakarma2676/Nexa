import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Plus, Play, Pause, ChevronUp, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useReelStore } from '../stores/reelStore'
import { Link } from 'react-router-dom'
import CreateReel from '../components/CreateReel'

export default function Reels() {
    const { reels, isLoading, hasMore, fetchReels, toggleLike, incrementView, currentIndex, setCurrentIndex } = useReelStore()
    const [isMuted, setIsMuted] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isPlaying, setIsPlaying] = useState(true)
    const containerRef = useRef(null)
    const videoRefs = useRef({})
    const observerRef = useRef(null)
    const viewedReels = useRef(new Set())

    // Fetch reels on mount
    useEffect(() => {
        fetchReels(true)
    }, [fetchReels])

    // Setup intersection observer for autoplay and view counting
    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = entry.target
                    const reelId = parseInt(video.dataset.reelId)
                    
                    if (entry.isIntersecting) {
                        // Play video when in view
                        video.play().catch(() => {})
                        setIsPlaying(true)
                        
                        // Find index and set current
                        const index = reels.findIndex(r => r.id === reelId)
                        if (index !== -1) {
                            setCurrentIndex(index)
                        }
                        
                        // Track view (only once per reel per session)
                        if (!viewedReels.current.has(reelId)) {
                            viewedReels.current.add(reelId)
                            incrementView(reelId)
                        }
                    } else {
                        // Pause video when out of view
                        video.pause()
                    }
                })
            },
            { threshold: 0.7 }
        )

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [reels, setCurrentIndex, incrementView])

    // Observe video elements
    useEffect(() => {
        const observer = observerRef.current
        if (!observer) return

        Object.values(videoRefs.current).forEach((video) => {
            if (video) observer.observe(video)
        })

        return () => {
            Object.values(videoRefs.current).forEach((video) => {
                if (video) observer.unobserve(video)
            })
        }
    }, [reels])

    // Handle scroll to load more
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return
        
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current
        if (scrollHeight - scrollTop - clientHeight < 500 && hasMore && !isLoading) {
            fetchReels()
        }
    }, [hasMore, isLoading, fetchReels])

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown' && currentIndex < reels.length - 1) {
                scrollToReel(currentIndex + 1)
            } else if (e.key === 'ArrowUp' && currentIndex > 0) {
                scrollToReel(currentIndex - 1)
            } else if (e.key === ' ') {
                e.preventDefault()
                togglePlayPause()
            } else if (e.key === 'm') {
                setIsMuted(!isMuted)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentIndex, reels.length, isMuted])

    const scrollToReel = (index) => {
        const video = videoRefs.current[reels[index]?.id]
        if (video) {
            video.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    const togglePlayPause = () => {
        const currentVideo = videoRefs.current[reels[currentIndex]?.id]
        if (currentVideo) {
            if (currentVideo.paused) {
                currentVideo.play()
                setIsPlaying(true)
            } else {
                currentVideo.pause()
                setIsPlaying(false)
            }
        }
    }

    const handleVideoClick = (e) => {
        // Prevent click on action buttons
        if (e.target.closest('.action-buttons')) return
        togglePlayPause()
    }

    if (isLoading && reels.length === 0) {
        return (
            <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] flex items-center justify-center bg-black">
                <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!isLoading && reels.length === 0) {
        return (
            <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-black text-white">
                <Play className="w-16 h-16 mb-4 opacity-50" />
                <h2 className="text-2xl font-bold mb-2">No Reels Yet</h2>
                <p className="text-gray-400 mb-6">Be the first to share a reel!</p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
                >
                    Create Reel
                </button>
                <CreateReel isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] bg-black overflow-hidden">
            {/* Create Button */}
            <button
                onClick={() => setShowCreateModal(true)}
                className="fixed top-18 right-7 z-50 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group"
            >
                <Plus className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Navigation Arrows (Desktop) */}
            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2">
                <button
                    onClick={() => currentIndex > 0 && scrollToReel(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors disabled:opacity-30"
                >
                    <ChevronUp className="w-6 h-6 text-white" />
                </button>
                <button
                    onClick={() => currentIndex < reels.length - 1 && scrollToReel(currentIndex + 1)}
                    disabled={currentIndex === reels.length - 1}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors disabled:opacity-30"
                >
                    <ChevronDown className="w-6 h-6 text-white" />
                </button>
            </div>

            {/* Reels Container */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {reels.map((reel, index) => (
                    <div
                        key={reel.id}
                        className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] w-full snap-start snap-always flex items-center justify-center relative"
                    >
                        {/* Video */}
                        <video
                            ref={(el) => { videoRefs.current[reel.id] = el }}
                            data-reel-id={reel.id}
                            src={reel.video_url}
                            className="h-full w-full object-contain max-w-md mx-auto"
                            loop
                            playsInline
                            muted={isMuted}
                            onClick={handleVideoClick}
                            poster={reel.thumbnail_url}
                        />

                        {/* Play/Pause Indicator */}
                        {currentIndex === index && !isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="p-4 bg-black/50 rounded-full">
                                    <Play className="w-12 h-12 text-white" fill="white" />
                                </div>
                            </div>
                        )}

                        {/* Overlay Content */}
                        <div className="absolute inset-0 flex pointer-events-none max-w-md mx-auto">
                            {/* Left: Author Info */}
                            <div className="absolute bottom-4 left-4 right-20 pointer-events-auto">
                                <Link 
                                    to={`/profile/${reel.author.username}`}
                                    className="flex items-center gap-3 mb-3"
                                >
                                    <img
                                        src={reel.author.avatar_url || `https://ui-avatars.com/api/?name=${reel.author.username}&background=4F46E5&color=fff`}
                                        alt={reel.author.username}
                                        className="w-10 h-10 rounded-full border-2 border-white"
                                    />
                                    <span className="font-semibold text-white text-shadow">
                                        {reel.author.display_name || reel.author.username}
                                    </span>
                                </Link>
                                {reel.caption && (
                                    <p className="text-white text-sm text-shadow line-clamp-2">
                                        {reel.caption}
                                    </p>
                                )}
                                <p className="text-white/70 text-xs mt-1">
                                    {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
                                </p>
                            </div>

                            {/* Right: Action Buttons */}
                            <div className="action-buttons absolute bottom-4 right-4 flex flex-col gap-5 items-center pointer-events-auto">
                                {/* Like */}
                                <button
                                    onClick={() => toggleLike(reel.id)}
                                    className="flex flex-col items-center"
                                >
                                    <Heart
                                        className={`w-8 h-8 ${reel.is_liked ? 'text-red-500 fill-red-500' : 'text-white'}`}
                                    />
                                    <span className="text-white text-xs mt-1">{reel.likes_count || 0}</span>
                                </button>

                                {/* Comments */}
                                <button className="flex flex-col items-center">
                                    <MessageCircle className="w-8 h-8 text-white" />
                                    <span className="text-white text-xs mt-1">{reel.comments_count || 0}</span>
                                </button>

                                {/* Share */}
                                <button className="flex flex-col items-center">
                                    <Share2 className="w-8 h-8 text-white" />
                                    <span className="text-white text-xs mt-1">Share</span>
                                </button>

                                {/* Mute */}
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className="p-2 bg-black/30 rounded-full"
                                >
                                    {isMuted ? (
                                        <VolumeX className="w-6 h-6 text-white" />
                                    ) : (
                                        <Volume2 className="w-6 h-6 text-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading More */}
                {isLoading && reels.length > 0 && (
                    <div className="h-20 flex items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
                    </div>
                )}
            </div>

            {/* Create Reel Modal */}
            <CreateReel isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

            {/* Hide scrollbar */}
            <style>{`
                div::-webkit-scrollbar {
                    display: none;
                }
                .text-shadow {
                    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    )
}
