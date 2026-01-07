import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotificationStore } from '../stores/notificationStore'

export default function Notifications() {
    const navigate = useNavigate()
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore()
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('all') // 'all' | 'unread'

    useEffect(() => {
        const loadNotifications = async () => {
            setIsLoading(true)
            await fetchNotifications()
            setIsLoading(false)
        }
        loadNotifications()
    }, [fetchNotifications])

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id)

        if (notification.post_id) {
            navigate(`/profile/${notification.actor.username}`)
        } else if (notification.type === 'follow') {
            navigate(`/profile/${notification.actor.username}`)
        }
    }

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications

    return (
        <div className="max-w-2xl mx-auto py-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-(--color-bg) transition-colors lg:hidden"
                    >
                        <ArrowLeft className="w-5 h-5 text-(--color-text-primary)" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-(--color-text-primary) flex items-center gap-2">
                            <Bell className="w-6 h-6 sm:w-7 sm:h-7" />
                            Notifications
                        </h1>
                        {unreadCount > 0 && (
                            <p className="text-xs sm:text-sm text-(--color-text-muted) mt-1">
                                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="flex gap-2 px-4 py-2 text-sm font-medium text-(--color-primary) hover:bg-(--color-primary-light) rounded-lg transition-colors w-full sm:w-auto"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${filter === 'all'
                        ? 'bg-(--color-primary) text-white'
                        : 'bg-(--color-bg) text-(--color-text-secondary) hover:bg-gray-200'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${filter === 'unread'
                        ? 'bg-(--color-primary) text-white'
                        : 'bg-(--color-bg) text-(--color-text-secondary) hover:bg-gray-200'
                        }`}
                >
                    Unread
                </button>
            </div>

            {/* Notifications List */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-2 border-(--color-primary) border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-(--color-text-muted)">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <Bell className="w-16 h-16 text-(--color-text-muted) mx-auto mb-4 opacity-40" />
                        <h3 className="text-lg font-semibold text-(--color-text-primary) mb-1">
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </h3>
                        <p className="text-(--color-text-muted)">
                            {filter === 'unread'
                                ? "You're all caught up!"
                                : "When you get notifications, they'll appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-(--color-border)">
                        {filteredNotifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full flex items-start gap-4 px-4 py-4 hover:bg-(--color-bg) transition-colors text-left ${!notification.read ? 'bg-(--color-primary-light)' : ''
                                    }`}
                            >
                                {/* Avatar */}
                                <img
                                    src={notification.actor.avatar_url || `https://ui-avatars.com/api/?name=${notification.actor.username}&background=4F46E5&color=fff`}
                                    alt={notification.actor.username}
                                    className="w-14 h-14 rounded-full shrink-0"
                                />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-(--color-text-primary) leading-relaxed">
                                        {notification.message}
                                    </p>
                                    <p className="text-sm text-(--color-text-muted) mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>

                                {/* Unread indicator */}
                                {!notification.read ? (
                                    <span className="w-3 h-3 rounded-full bg-(--color-primary) shrink-0 mt-2" />
                                ) : (
                                    <Check className="w-5 h-5 text-(--color-text-muted) shrink-0 mt-1" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
