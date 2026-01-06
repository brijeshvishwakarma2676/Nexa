import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, Users as UsersIcon, Eye } from 'lucide-react'
import api from '../services/api'
import RelationshipButton from '../components/RelationshipButton'

/**
 * Users Page - Browse and search all users
 */
export default function Users() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch all users or search based on query
    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true)
            try {
                if (query.trim().length >= 2) {
                    const response = await api.get(`/users/search/${encodeURIComponent(query)}`)
                    setUsers(response.data.users || [])
                } else {
                    const response = await api.get('/users/search/a')
                    setUsers(response.data.users || [])
                }
            } catch (error) {
                console.error('Failed to fetch users:', error)
                setUsers([])
            } finally {
                setIsLoading(false)
            }
        }

        const timer = setTimeout(fetchUsers, 300)
        return () => clearTimeout(timer)
    }, [query])

    return (
        <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4">
            {/* Header with Search */}
            <div className="card mb-6">
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <h1 className="text-2xl font-bold text-(--color-text-primary) flex items-center gap-2">
                            <UsersIcon className="w-7 h-7 text-(--color-primary)" />
                            Discover People
                        </h1>
                        <p className="text-sm text-(--color-text-muted)">
                            {users.length} users found
                        </p>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by username or name..."
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
                        {query.length >= 2 ? `No results for "${query}"` : 'Try searching for someone'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.map((user) => (
                        <div
                            key={user.id}
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

                            {/* Action buttons - stacked vertically for consistent layout */}
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
            )}
        </div>
    )
}
