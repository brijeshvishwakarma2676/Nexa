import { Plus, ChevronRight, ChevronLeft } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'
import { useRef, useState } from 'react'
import CreateStory from './CreateStory'

export default function StoryBar() {
  const { user } = useAuthStore()
  const { storyGroups, openViewer } = useStoryStore()
  const scrollRef = useRef(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Find current user's stories
  const userStoryGroup = storyGroups.find((g) => g.user.id === user?.id)
  const otherStoryGroups = storyGroups.filter((g) => g.user.id !== user?.id)

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative bg-white rounded-lg shadow-sm border border-(--color-border) p-3">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-(--color-border) flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-(--color-text-primary)" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && storyGroups.length > 3 && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-(--color-border) flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-(--color-text-primary)" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
      >
        {/* Create Story Card */}
        <div
          onClick={() => setShowCreateModal(true)}
          className="flex-shrink-0 w-28 h-48 relative rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-(--color-border)"
        >
          {/* User's photo as background */}
          <div className="h-3/4 bg-linear-to-b from-blue-500 to-indigo-600">
            <img
              src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
              alt="Create story"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Bottom section */}
          <div className="h-1/4 bg-white flex flex-col items-center justify-center pt-4">
            <span className="text-xs font-semibold text-gray-800">Create story</span>
          </div>

          {/* Plus button */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[72%] -translate-y-1/2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-white">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* User's own stories */}
        {userStoryGroup && (
          <StoryCard
            group={userStoryGroup}
            index={storyGroups.indexOf(userStoryGroup)}
            onClick={openViewer}
            isOwn
          />
        )}

        {/* Other users' stories */}
        {otherStoryGroups.map((group) => (
          <StoryCard
            key={group.user.id}
            group={group}
            index={storyGroups.indexOf(group)}
            onClick={openViewer}
          />
        ))}
      </div>

      {/* Create Story Modal */}
      <CreateStory
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}

function StoryCard({ group, index, onClick, isOwn = false }) {
  const hasUnseen = !group.all_seen
  const latestStory = group.stories[group.stories.length - 1]

  return (
    <button
      onClick={() => onClick(index)}
      className="flex-shrink-0 w-28 h-48 relative rounded-xl overflow-hidden group"
    >
      {/* Story image background */}
      <div className="absolute inset-0">
        <img
          src={latestStory?.media_url || group.user.avatar_url || `https://ui-avatars.com/api/?name=${group.user.username}&background=4F46E5&color=fff`}
          alt={group.user.username}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* User avatar with ring */}
      <div className="absolute top-3 left-3">
        <div className={`p-0.5 rounded-full ${hasUnseen ? 'bg-linear-to-tr from-(--color-primary) to-(--color-secondary)' : 'bg-gray-300'}`}>
          <img
            src={group.user.avatar_url || `https://ui-avatars.com/api/?name=${group.user.username}&background=4F46E5&color=fff`}
            alt={group.user.username}
            className="w-9 h-9 rounded-full ring-2 ring-white object-cover"
          />
        </div>
      </div>

      {/* Username at bottom */}
      <div className="absolute bottom-3 left-3 right-3">
        <span className={`text-xs font-medium text-white drop-shadow-lg line-clamp-2 ${hasUnseen ? '' : 'opacity-80'}`}>
          {isOwn ? 'Your Story' : group.user.display_name || group.user.username}
        </span>
      </div>
    </button>
  )
}
