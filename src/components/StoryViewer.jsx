import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Pause, Play, Loader2 } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { formatTimeAgo } from '../utils/dateUtils'

const STORY_DURATION = 5000 // 5 seconds per story
const PROGRESS_INTERVAL = 50 // Update every 50ms for smooth animation

export default function StoryViewer() {
  const {
    storyGroups,
    currentGroupIndex,
    currentStoryIndex,
    closeViewer,
    nextStory,
    prevStory,
    getCurrentStory,
    getCurrentGroup,
  } = useStoryStore()

  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentStory = getCurrentStory()
  const currentGroup = getCurrentGroup()

  // Track elapsed time and image ref
  const elapsedRef = useRef(0)
  const imgRef = useRef(null)

  // Reset progress and loading when story changes
  useEffect(() => {
    setProgress(0)
    elapsedRef.current = 0
    
    // If it's a text story, we don't need to wait at all
    if (!currentStory?.image_url) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Check if image is already cached/complete immediately
    if (imgRef.current?.complete) {
      setIsLoading(false)
    }
    
    // Safety fallback: if anything gets stuck, force stop loading after 2s
    const fallback = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(fallback)
  }, [currentStory?.id])

  // Simple interval-based timer (more stable than RAF)
  useEffect(() => {
    if (!currentStory || isPaused || isLoading) return

    const interval = setInterval(() => {
      elapsedRef.current += PROGRESS_INTERVAL
      const newProgress = Math.min((elapsedRef.current / STORY_DURATION) * 100, 100)
      setProgress(newProgress)

      if (newProgress >= 100) {
        clearInterval(interval)
        nextStory()
      }
    }, PROGRESS_INTERVAL)

    return () => clearInterval(interval)
  }, [currentStory?.id, isPaused, isLoading, nextStory])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextStory()
      else if (e.key === 'ArrowLeft') prevStory()
      else if (e.key === 'Escape') closeViewer()
      else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused((p) => !p)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextStory, prevStory, closeViewer])

  if (!currentStory || !currentGroup) {
    return null
  }

  const totalStories = currentGroup.stories.length

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close button - high z-index */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); closeViewer(); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50 pointer-events-auto"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Previous button - high z-index and stop propagation */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); prevStory(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50 pointer-events-auto"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      {/* Next button - high z-index and stop propagation */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); nextStory(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50 pointer-events-auto"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Story content - 9:16 aspect ratio */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: 'min(400px, 90vw)',
          aspectRatio: '9/16',
          maxHeight: '90vh'
        }}
      >
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
          {currentGroup.stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < currentStoryIndex
                      ? '100%'
                      : index === currentStoryIndex
                        ? `${progress}%`
                        : '0%',
                }}
              />
              {index === currentStoryIndex && isLoading && (
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* User info */}                                             
        <div className="absolute top-10 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img
              src={currentGroup.user.avatar_url || `https://ui-avatars.com/api/?name=${currentGroup.user.username}&background=4F46E5&color=fff`}
              alt={currentGroup.user.username}
              className="w-10 h-10 rounded-full avatar ring-2 ring-white"
            />
            <div>
              <p className="text-white font-medium drop-shadow-lg">
                {currentGroup.user.display_name || currentGroup.user.username}
              </p>
              <p className="text-white/70 text-sm drop-shadow">
                {formatTimeAgo(currentStory.created_at)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPaused((p) => !p)}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>

        {/* Story image or text - click areas for navigation */}
        <div
          className="w-full h-full relative"
          onMouseDown={() => { if (!isLoading) setIsPaused(true); }}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => { if (!isLoading) setIsPaused(true); }}
          onTouchEnd={() => setIsPaused(false)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            if (x < rect.width / 3) {
              prevStory()
            } else if (x > rect.width * 2 / 3) {
              nextStory()
            }
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 backdrop-blur-sm z-20">
              <Loader2 className="w-12 h-12 text-white animate-spin opacity-50" />
            </div>
          )}

          {currentStory.image_url ? (
            <img
              ref={imgRef}
              src={currentStory.image_url}
              alt="Story"
              className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={(e) => { if (e.currentTarget.complete) setIsLoading(false); }}
              onError={() => setIsLoading(false)}
              loading="eager"
            />
          ) : (
            <div 
              className="w-full h-full bg-linear-to-br from-(--color-primary) to-(--color-secondary) flex items-center justify-center p-8"
            >
              <p className="text-white text-2xl font-bold text-center leading-relaxed drop-shadow-lg">
                {currentStory.content}
              </p>
            </div>
          )}
        </div>

        {/* Story counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm drop-shadow">
          {currentStoryIndex + 1} / {totalStories}
        </div>
      </div>
    </div>
  )
}
