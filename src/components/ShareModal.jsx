import { useState, useEffect } from 'react'
import { X, Search, Send, Loader2, CheckCircle2 } from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'

export default function ShareModal({ post, onClose }) {
    const { user } = useAuthStore()
    const { startConversation, sendMessage } = useChatStore()
    const [friends, setFriends] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFriends, setSelectedFriends] = useState([])
    const [isSending, setIsSending] = useState(false)
    const [sentStatus, setSentStatus] = useState({}) // { friendId: true }

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await api.get(`/users/${user.id}/friends`)
                setFriends(response.data.friends || [])
            } catch (error) {
                console.error('Failed to load friends:', error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchFriends()
    }, [user.id])

    const filteredFriends = friends.filter(f =>
        f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )

    const handleToggleSelect = (friendId) => {
        setSelectedFriends(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        )
    }

    const handleSendPost = async () => {
        if (selectedFriends.length === 0) return

        setIsSending(true)
        const authorName = post.author.display_name || post.author.username
        const postShareMsg = `[SHARED_POST:${post.id}:${authorName}]`

        try {
            for (const friendId of selectedFriends) {
                // If already sent, skip (though UI should prevent this)
                if (sentStatus[friendId]) continue

                // 1. Get/Start conversation
                const conversation = await startConversation(friendId)
                if (conversation) {
                    // 2. Send the special message via chatStore
                    // chatStore uses currentConversation, so we might need a more direct way
                    // or select the conversation first. But startConversation returns the conv.
                    // Let's add a direct send method to api or use chatStore logic carefully.
                    
                    // Direct API call is safer for bulk sending without switching active chat
                    await api.post(`/conversations/${conversation.id}/messages`, {
                        content: postShareMsg
                    })
                    
                    setSentStatus(prev => ({ ...prev, [friendId]: true }))
                }
            }
            
            // After sending, we could close the modal or show success
            setTimeout(() => {
                onClose()
            }, 800)
        } catch (error) {
            console.error('Failed to share post:', error)
        } finally {
            setIsSending(false)
        }
    }

    // Individual send for a single friend
    const handleIndividualSend = async (friendId) => {
        if (isSending || sentStatus[friendId]) return

        try {
            const conversation = await startConversation(friendId)
            if (conversation) {
                const authorName = post.author.display_name || post.author.username
                await api.post(`/conversations/${conversation.id}/messages`, {
                    content: `[SHARED_POST:${post.id}:${authorName}]`
                })
                setSentStatus(prev => ({ ...prev, [friendId]: true }))
            }
        } catch (error) {
            console.error('Failed to share post:', error)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl w-full sm:max-w-md overflow-hidden shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-(--color-border) flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-(--color-text-primary)">Share Post</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-(--color-primary)/10 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 scroll-smooth">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-(--color-primary) opacity-20" />
                        </div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-10" />
                            <p className="text-sm">No friends found.</p>
                        </div>
                    ) : (
                        filteredFriends.map(friend => (
                            <div
                                key={friend.id}
                                className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                                    selectedFriends.includes(friend.id) ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                                }`}
                                onClick={() => handleToggleSelect(friend.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img
                                            src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.username}&background=4F46E5&color=fff`}
                                            className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-white"
                                            alt={friend.username}
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-[14px] text-(--color-text-primary) truncate max-w-[150px]">
                                            {friend.display_name || friend.username}
                                        </span>
                                        <span className="text-[12px] text-gray-400 truncate">@{friend.username}</span>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0">
                                    {sentStatus[friend.id] ? (
                                        <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Sent</span>
                                        </div>
                                    ) : (
                                        <div 
                                            className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                                selectedFriends.includes(friend.id)
                                                    ? 'bg-(--color-primary) border-(--color-primary)'
                                                    : 'border-gray-200 group-hover:border-gray-300'
                                            }`}
                                        >
                                            {selectedFriends.includes(friend.id) && (
                                                <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Send Button */}
                <div className="p-4 bg-white border-t border-gray-50 shrink-0">
                    <button
                        onClick={handleSendPost}
                        disabled={selectedFriends.length === 0 || isSending}
                        className="w-full bg-(--color-primary) hover:brightness-105 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-[15px]">Sharing...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                <span className="text-[15px]">Send {selectedFriends.length > 0 ? `to ${selectedFriends.length} friends` : ''}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
