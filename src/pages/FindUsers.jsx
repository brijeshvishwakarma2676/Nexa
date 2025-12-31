import { useState, useEffect } from 'react'
import { Search, Loader2, Users } from 'lucide-react'
import { useFollowStore } from '../stores/followStore'
import RelationshipButton from '../components/RelationshipButton'

/**
 * Find Users Page
 * Dedicated page for searching and discovering other users
 */
export default function FindUsers() {
  const [query, setQuery] = useState('')

  const {
    searchResults,
    searchLoading,
    searchUsers,
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        {/* Header */}
        <div className="p-4 border-b border-(--color-border)">
          <h1 className="text-xl font-bold text-(--color-text-primary) mb-4">
            Find Users
          </h1>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
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
        <div className="divide-y divide-(--color-border)">
          {searchLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-(--color-primary) animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-(--color-text-muted) mb-4" />
              <p className="text-(--color-text-muted)">
                {query.length >= 2
                  ? 'No users found'
                  : 'Type at least 2 characters to search'}
              </p>
            </div>
          ) : (
            searchResults.map((user) => (
              <div
                key={user.id}
                className="p-4 flex items-center gap-4 hover:bg-(--color-bg) transition-colors"
                onClick={(e) => {
                  // If clicking anything other than the button or its children
                  if (!e.target.closest('button')) {
                    // Navigate to profile (optional enhancement)
                  }
                }}
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
                  <p className="font-semibold text-(--color-text-primary) truncate">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-sm text-(--color-text-muted) truncate">
                    @{user.username}
                    {user.is_private && (
                      <span className="ml-2 text-xs bg-(--color-bg) px-2 py-0.5 rounded">
                        Private
                      </span>
                    )}
                  </p>
                </div>

                {/* Action button */}
                <RelationshipButton userId={user.id} status={user.relationship_status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
