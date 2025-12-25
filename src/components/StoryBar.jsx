import { Plus } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'

export default function StoryBar() {
  const { user } = useAuthStore()
  const { storyGroups, openViewer } = useStoryStore()

  // Find current user's stories
  const userStoryGroup = storyGroups.find((g) => g.user.id === user?.id)
  const otherStoryGroups = storyGroups.filter((g) => g.user.id !== user?.id)

  return (
    <div className="card p-4">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add Story Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => {
              // TODO: Open create story modal
              console.log('Create story')
            }}
            className="relative flex flex-col items-center"
          >
            <div className="relative">
              <img
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
                alt="Add story"
                className="w-16 h-16 rounded-full avatar ring-2 ring-[var(--color-border)]"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center ring-2 ring-white">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] mt-2 max-w-[72px] truncate">
              Add Story
            </span>
          </button>
        </div>

        {/* User's own stories */}
        {userStoryGroup && (
          <StoryAvatar
            group={userStoryGroup}
            index={storyGroups.indexOf(userStoryGroup)}
            onClick={openViewer}
            isOwn
          />
        )}

        {/* Other users' stories */}
        {otherStoryGroups.map((group) => (
          <StoryAvatar
            key={group.user.id}
            group={group}
            index={storyGroups.indexOf(group)}
            onClick={openViewer}
          />
        ))}
      </div>
    </div>
  )
}

function StoryAvatar({ group, index, onClick, isOwn = false }) {
  const hasUnseen = !group.all_seen

  return (
    <button
      onClick={() => onClick(index)}
      className="flex-shrink-0 flex flex-col items-center"
    >
      <div className={hasUnseen ? 'story-ring-unseen' : 'story-ring-seen'}>
        <img
          src={group.user.avatar_url || `https://ui-avatars.com/api/?name=${group.user.username}&background=4F46E5&color=fff`}
          alt={group.user.username}
          className="w-14 h-14 rounded-full avatar ring-2 ring-white"
        />
      </div>
      <span className={`text-xs mt-2 max-w-[72px] truncate ${hasUnseen ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-muted)]'
        }`}>
        {isOwn ? 'Your Story' : group.user.display_name || group.user.username}
      </span>
    </button>
  )
}
