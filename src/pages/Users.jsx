import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, Users as UsersIcon, Eye } from 'lucide-react'
import api from '../services/api'
import RelationshipButton from '../components/RelationshipButton'

/**
 * Users Page - Browse and search all users with infinite scroll
 */
export default function Users() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [users, setUsers] = useState([])
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    
    const observerRef = useRef(null)
    const LIMIT = 10

    // Fetch users (initial or paginated)
    const fetchUsers = async (searchQuery, currentOffset, isInitial = false) => {
        if (isInitial) {
            setIsLoading(true)
        } else {
            setIsLoadingMore(true)
        }

        try {
            const response = await api.get(`/users/search/${encodeURIComponent(searchQuery || 'a')}`, {
                params: { limit: LIMIT, offset: currentOffset }
            })
            const { users: newUsers, has_more } = response.data

            if (isInitial) {
                setUsers(newUsers)
            } else {
                setUsers(prev => [...prev, ...newUsers])
            }
            
            setHasMore(has_more)
            setOffset(currentOffset + newUsers.length)
        } catch (error) {
            console.error('Failed to fetch users:', error)
            if (isInitial) {
                setUsers([])
            }
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    // Reset and fetch when query changes
    useEffect(() => {
        const timer = setTimeout(() => {
            setOffset(0)
            setHasMore(true)
            fetchUsers(query, 0, true)
        }, 300)
        
        return () => clearTimeout(timer)
    }, [query])

    // Infinite scroll observer
    const lastUserRef = useCallback(
        (node) => {
            if (isLoading || isLoadingMore) return

            if (observerRef.current) {
                observerRef.current.disconnect()
            }

            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    fetchUsers(query, offset, false)
                }
            })

            if (node) {
                observerRef.current.observe(node)
            }
        },
        [isLoading, isLoadingMore, hasMore, offset, query]
    )

    return (
        <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 pt-14 pb-20 lg:pb-4">
            {/* Header with Search */}
            <div className="card mb-6">
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <h1 className="text-2xl font-bold text-(--color-text-primary) flex items-center gap-2">
                            <UsersIcon className="w-7 h-7 text-(--color-primary)" />
                            Discover People
                        </h1>
                        <p className="text-sm text-(--color-text-muted)">
                            {users.length} user{users.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by username..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-(--color-bg) border border-(--color-border) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent transition text-base"
                            autoFocus
                        />
                    </div>
                </div>
            </div>

            {/* Users Grid */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-(--color-primary) animate-spin" />
                </div>
            ) : users.length === 0 ? (
                <div className="card p-12 text-center">
                    <UsersIcon className="w-16 h-16 mx-auto text-(--color-text-muted) mb-4" />
                    <h3 className="text-xl font-semibold text-(--color-text-primary) mb-2">No users found</h3>
                    <p className="text-(--color-text-muted)">
                        {query.length >= 2 ? `No results for "@${query}"` : 'Try searching for someone'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {users.map((user, index) => (
                            <div
                                key={user.id}
                                ref={index === users.length - 1 ? lastUserRef : null}
                                className="card p-5 hover:shadow-lg transition-all duration-200 flex flex-col"
                            >
                                {/* Avatar */}
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=4F46E5&color=fff&size=128`}
                                        alt={user.username}
                                        className="w-20 h-20 rounded-full object-cover ring-4 ring-(--color-bg) shadow-md"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=4F46E5&color=fff&size=128`
                                        }}
                                    />
                                </div>

                                {/* User info */}
                                <div className="text-center mb-4 flex-1">
                                    <p className="font-semibold text-(--color-text-primary) truncate">
                                        {user.display_name || user.username}
                                    </p>
                                    <p className="text-sm text-(--color-text-muted) truncate">
                                        @{user.username}
                                    </p>
                                    {user.is_private && (
                                        <span className="inline-block mt-2 text-xs bg-(--color-bg) text-(--color-text-muted) px-2 py-0.5 rounded-full">
                                            Private
                                        </span>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => navigate(`/profile/${user.username}`)}
                                        className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-(--color-bg) hover:bg-(--color-border) text-(--color-text-primary) transition flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View Profile
                                    </button>
                                    <div className="w-full [&>button]:w-full [&>button]:justify-center">
                                        <RelationshipButton
                                            userId={user.id}
                                            status={user.relationship_status}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Loading More Indicator */}
                    {isLoadingMore && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 text-(--color-primary) animate-spin" />
                        </div>
                    )}

                    {/* End of Results */}
                    {!isLoadingMore && !hasMore && users.length > 0 && (
                        <p className="text-center text-(--color-text-muted) py-8">
                            You've reached the end
                        </p>
                    )}
                </>
            )}
        </div>
    )
}
