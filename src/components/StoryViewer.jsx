import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { formatDistanceToNow } from 'date-fns'

const STORY_DURATION = 5000 // 5 seconds per story

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

  const currentStory = getCurrentStory()
  const currentGroup = getCurrentGroup()

  // Auto-advance timer
  useEffect(() => {
    if (!currentStory || isPaused) return

    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return prev
        }
        return prev + (100 / (STORY_DURATION / 100))
      })
    }, 100)

    const timeout = setTimeout(() => {
      nextStory()
    }, STORY_DURATION)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [currentStory?.id, isPaused, nextStory])

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
      {/* Close button */}
      <button
        onClick={closeViewer}
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Previous button */}
      <button
        onClick={prevStory}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      {/* Next button */}
      <button
        onClick={nextStory}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
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
                {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
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
          className="w-full h-full"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            if (x < rect.width / 3) {
              prevStory()
            } else if (x > rect.width * 2 / 3) {
              nextStory()
            } else {
              setIsPaused((p) => !p)
            }
          }}
        >
          {currentStory.image_url ? (
            <img
              src={currentStory.image_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-(--color-primary) to-(--color-secondary) flex items-center justify-center p-8">
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
