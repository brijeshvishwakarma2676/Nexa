import { useState, useEffect } from 'react'
import { Search, Loader2, UserPlus, UserMinus, Clock, Users } from 'lucide-react'
import { useFollowStore } from '../stores/followStore'

/**
 * Find Users Page
 * Dedicated page for searching and discovering other users
 */
export default function FindUsers() {
  const [query, setQuery] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  const {
    searchResults,
    searchLoading,
    searchUsers,
    followUser,
    unfollowUser,
    clearSearch
  } = useFollowStore()

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchUsers(query)
      } else {
        clearSearch()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchUsers, clearSearch])

  const handleFollow = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }))
    try {
      await followUser(userId)
    } catch (error) {
      console.error('Follow failed:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleUnfollow = async (userId) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }))
    try {
      await unfollowUser(userId)
    } catch (error) {
      console.error('Unfollow failed:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const renderButton = (user) => {
    const isLoading = actionLoading[user.id]

    switch (user.relationship_status) {
      case 'following':
        return (
          <button
            onClick={() => handleUnfollow(user.id)}
            disabled={isLoading}
            className="btn btn-secondary px-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <Users className="w-4 h-4" />
                Friends
              </>
            )}
          </button>
        )
      case 'pending_sent':
        return (
          <button
            onClick={() => handleUnfollow(user.id)}
            disabled={isLoading}
            className="btn btn-outline px-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <Clock className="w-4 h-4" />
                Requested
              </>
            )}
          </button>
        )
      case 'pending_received':
        return (
          <button
            disabled
            className="btn btn-outline px-4 opacity-60"
          >
            <Clock className="w-4 h-4" />
            Pending
          </button>
        )
      default:
        return (
          <button
            onClick={() => handleFollow(user.id)}
            disabled={isLoading}
            className="btn btn-primary px-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <UserPlus className="w-4 h-4" />
                Request
              </>
            )}
          </button>
        )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
            Find Users
          </h1>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or name..."
              className="input pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="divide-y divide-[var(--color-border)]">
          {searchLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-[var(--color-primary)] animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
              <p className="text-[var(--color-text-muted)]">
                {query.length >= 2
                  ? 'No users found'
                  : 'Type at least 2 characters to search'}
              </p>
            </div>
          ) : (
            searchResults.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center gap-4 hover:bg-[var(--color-bg)] transition-colors"
              >
                {/* Avatar */}
                <img
                  src={user.avatar_url ||
                    `https://ui-avatars.com/api/?name=${user.username}&background=4F46E5&color=fff`}
                  alt={user.username}
                  className="w-12 h-12 rounded-full avatar"
                />

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] truncate">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] truncate">
                    @{user.username}
                    {user.is_private && (
                      <span className="ml-2 text-xs bg-[var(--color-bg)] px-2 py-0.5 rounded">
                        Private
                      </span>
                    )}
                  </p>
                </div>

                {/* Action button */}
                {renderButton(user)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
