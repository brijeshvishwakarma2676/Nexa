import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Search, ArrowLeft, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'

export default function Chat() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    typingUsers,
    fetchConversations,
    selectConversation,
    sendMessage,
    sendTyping,
    isUserOnline,
  } = useChatStore()

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Select conversation from URL
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      selectConversation(parseInt(conversationId))
    }
  }, [conversationId, selectConversation]) // Removed conversations to prevent re-fetch loop

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle typing indicator
  const handleTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    sendTyping()

    typingTimeoutRef.current = setTimeout(() => {
      // Stop sending typing indicator
    }, 1000)
  }

  // Send message
  const handleSend = async (e) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    await sendMessage(newMessage.trim())
    setNewMessage('')
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    c.other_user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.other_user.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  // Check if other user is typing
  const isOtherTyping = currentConversation && typingUsers[currentConversation.id]

  return (
    <div className="px-4 pb-20 lg:pb-4">
    <div className="card h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex overflow-hidden">
      {/* Conversations List */}
      <div className={`w-full md:w-80 border-r border-(--color-border) flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'
        }`}>
        {/* Header */}
        <div className="p-4 border-b border-(--color-border)">
          <h2 className="text-xl font-bold text-(--color-text-primary) mb-4">
            Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="input pl-10"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-(--color-text-muted)">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-(--color-bg) transition-colors ${currentConversation?.id === conv.id ? 'bg-(--color-primary-light)' : ''
                  }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={conv.other_user.avatar_url || `https://ui-avatars.com/api/?name=${conv.other_user.username}&background=4F46E5&color=fff`}
                    alt={conv.other_user.username}
                    className="w-12 h-12 rounded-full avatar"
                  />
                  {isUserOnline(conv.other_user.id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-(--color-secondary) ring-2 ring-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-(--color-text-primary) truncate">
                      {conv.other_user.display_name || conv.other_user.username}
                    </p>
                    {conv.last_message && (
                      <span className="text-xs text-(--color-text-muted)">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-sm text-(--color-text-muted) truncate flex-1">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="badge flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${conversationId ? 'flex' : 'hidden md:flex'
        }`}>
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-(--color-border) flex items-center gap-3">
              <button
                onClick={() => navigate('/chat')}
                className="md:hidden p-2 rounded-full hover:bg-(--color-bg) transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative">
                <img
                  src={currentConversation.other_user.avatar_url || `https://ui-avatars.com/api/?name=${currentConversation.other_user.username}&background=4F46E5&color=fff`}
                  alt={currentConversation.other_user.username}
                  className="w-10 h-10 rounded-full avatar"
                />
                {isUserOnline(currentConversation.other_user.id) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-(--color-secondary) ring-2 ring-white" />
                )}
              </div>

              <div>
                <p className="font-semibold text-(--color-text-primary)">
                  {currentConversation.other_user.display_name || currentConversation.other_user.username}
                </p>
                <p className="text-sm text-(--color-text-muted)">
                  {isOtherTyping
                    ? 'Typing...'
                    : isUserOnline(currentConversation.other_user.id)
                      ? 'Online'
                      : 'Offline'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-(--color-primary) animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-(--color-primary-light) flex items-center justify-center mb-4">
                    <span className="text-3xl">👋</span>
                  </div>
                  <p className="text-(--color-text-muted)">
                    Start the conversation by sending a message
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender.id === user?.id

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMine
                          ? 'bg-(--color-primary) text-white rounded-br-md'
                          : 'bg-(--color-bg) text-(--color-text-primary) rounded-bl-md'
                          }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-(--color-text-muted)'
                          }`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Typing indicator */}
              {isOtherTyping && (
                <div className="flex justify-start">
                  <div className="bg-(--color-bg) rounded-2xl px-4 py-2 rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-(--color-text-muted) animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-(--color-text-muted) animate-pulse delay-100" />
                      <span className="w-2 h-2 rounded-full bg-(--color-text-muted) animate-pulse delay-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-(--color-border)">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    handleTyping()
                  }}
                  placeholder="Type a message..."
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="btn btn-primary px-4"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-(--color-primary-light) flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold text-(--color-text-primary) mb-2">
              Your Messages
            </h3>
            <p className="text-(--color-text-muted)">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
