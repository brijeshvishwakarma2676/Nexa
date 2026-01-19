import { create } from 'zustand'
import api from '../services/api'

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  pendingMessages: new Map(), // Track messages being sent
  isLoadingConversations: false,
  isLoadingMessages: false,
  hasMore: false,
  error: null,

  // WebSocket connection
  ws: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: {},
  pendingReactions: new Map(), // Track reactions being sent

  // Reply state
  replyingTo: null,

  // Fetch conversations list
  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null })

    try {
      const response = await api.get('/conversations')
      set({ conversations: response.data.conversations, isLoadingConversations: false })
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Failed to load conversations',
        isLoadingConversations: false
      })
    }
  },

  // Start or get conversation with user
  startConversation: async (userId) => {
    try {
      const response = await api.post('/conversations', { user_id: userId })
      const conversation = response.data

      // Add to list if not exists
      set((state) => {
        const exists = state.conversations.find((c) => c.id === conversation.id)
        if (!exists) {
          return { conversations: [conversation, ...state.conversations] }
        }
        return {}
      })

      return conversation
    } catch (error) {
      console.error('Failed to start conversation:', error)
      return null
    }
  },

  // Select conversation and load messages
  selectConversation: async (conversationId) => {
    let conversation = get().conversations.find((c) => c.id === conversationId)
    
    set({
      isLoadingMessages: true,
      messages: [],
      hasMore: false,
      replyingTo: null
    })

    // If not found in list, fetch it
    if (!conversation) {
      try {
        const response = await api.get(`/conversations/${conversationId}`)
        conversation = response.data
        // Add to list
        set(state => ({
          conversations: [conversation, ...state.conversations]
        }))
      } catch (error) {
        console.error('Failed to fetch conversation details:', error)
        set({ isLoadingMessages: false, error: 'Conversation not found' })
        return
      }
    }

    set({ currentConversation: conversation })
    await get().fetchMessages(conversationId)

    // Mark as read via WebSocket
    const { ws, messages } = get()
    if (ws && ws.readyState === WebSocket.OPEN && messages.length > 0) {
      const unreadMessages = messages.filter(m => 
        m.sender_id !== conversation.other_user?.id && m.status?.toLowerCase() !== 'read'
      )
      if (unreadMessages.length > 0) {
        ws.send(JSON.stringify({
          type: 'mark_read',
          message_ids: unreadMessages.map(m => m.id)
        }))
      }
    }

    // Also update via API
    try {
      await api.patch(`/conversations/${conversationId}/read`)
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  },

  // Fetch messages for conversation
  fetchMessages: async (conversationId, cursor = null) => {
    set({ isLoadingMessages: true })

    try {
      const params = { limit: 50 }
      if (cursor) params.cursor = cursor

      const response = await api.get(`/conversations/${conversationId}/messages`, { params })
      const { messages, has_more } = response.data

      set((state) => ({
        messages: cursor ? [...messages, ...state.messages] : messages,
        hasMore: has_more,
        isLoadingMessages: false,
      }))
    } catch (error) {
      set({ isLoadingMessages: false })
      console.error('Failed to load messages:', error)
    }
  },

  // Send message with optimistic update
  sendMessage: async (content, options = {}) => {
    const { currentConversation, ws, replyingTo } = get()
    if (!currentConversation) return null

    const clientMsgId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Get user from authStore
    const user = JSON.parse(localStorage.getItem('user') || '{}')

    // Optimistic update - add message immediately with 'sending' status
    const tempMessage = {
      id: clientMsgId,
      client_msg_id: clientMsgId,
      conversation_id: currentConversation.id,
      sender_id: user.id,
      sender: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      },
      content,
      status: 'sending',
      read: false,
      created_at: new Date().toISOString(),
      reply_to_id: options.replyTo?.id || replyingTo?.id || null,
      reply_to: options.replyTo || replyingTo || null,
      media_type: options.mediaType || null,
      media_url: options.mediaUrl || null,
      media_thumbnail_url: options.mediaThumbnailUrl || null,
      media_duration: options.mediaDuration || null,
      media_file_name: options.mediaFileName || null,
      media_file_size: options.mediaFileSize || null,
      is_deleted: false,
      reactions: [],
      is_temporary: true
    }

    // Add to messages and pending
    set(state => ({
      messages: [...state.messages, tempMessage],
      pendingMessages: new Map(state.pendingMessages).set(clientMsgId, tempMessage),
      replyingTo: null // Clear reply after sending
    }))

    // Update conversation list
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === currentConversation.id
          ? { ...c, last_message: tempMessage, updated_at: tempMessage.created_at }
          : c
      ),
    }))

    // Send via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'send_message',
        conversation_id: currentConversation.id,
        content,
        client_msg_id: clientMsgId,
        reply_to_id: options.replyTo?.id || replyingTo?.id || null,
        media_type: options.mediaType,
        media_url: options.mediaUrl,
        media_thumbnail_url: options.mediaThumbnailUrl,
        media_duration: options.mediaDuration,
        media_file_name: options.mediaFileName,
        media_file_size: options.mediaFileSize
      }))
    } else {
      // Fallback to REST if WebSocket is not available
      try {
        const response = await api.post(
          `/conversations/${currentConversation.id}/messages`,
          { 
            content,
            reply_to_id: options.replyTo?.id || replyingTo?.id,
            media_type: options.mediaType,
            media_url: options.mediaUrl
          }
        )
        // Replace temp message with real one
        set(state => ({
          messages: state.messages.map(m =>
            m.client_msg_id === clientMsgId ? { ...response.data, is_temporary: false } : m
          ),
          pendingMessages: new Map([...state.pendingMessages].filter(([k]) => k !== clientMsgId))
        }))
      } catch (error) {
        // Mark message as failed
        set(state => ({
          messages: state.messages.map(m =>
            m.client_msg_id === clientMsgId ? { ...m, status: 'failed' } : m
          )
        }))
        console.error('Failed to send message:', error)
      }
    }

    return tempMessage
  },

  // Set reply target
  setReplyingTo: (message) => {
    set({ replyingTo: message })
  },

  // Clear reply target
  clearReplyingTo: () => {
    set({ replyingTo: null })
  },

  // React to message
  reactToMessage: (messageId, emoji) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    // Track as pending
    set(state => ({
      pendingReactions: new Map(state.pendingReactions).set(messageId, true)
    }))

    ws.send(JSON.stringify({
      type: 'react',
      message_id: messageId,
      emoji
    }))
  },

  // Delete message
  deleteMessage: (messageId, deleteForEveryone = false) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({
      type: 'delete_message',
      message_id: messageId,
      delete_for_everyone: deleteForEveryone
    }))
  },

  // Forward message
  forwardMessage: (messageId, toConversationIds) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({
      type: 'forward_message',
      message_id: messageId,
      to_conversation_ids: toConversationIds
    }))
  },

  // Mark messages as read
  markMessagesAsRead: (messageIds) => {
    const { ws } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({
      type: 'mark_read',
      message_ids: messageIds
    }))
  },

  // Connect WebSocket
  connectWebSocket: () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    // Determine WebSocket URL
    let wsUrl
    if (import.meta.env.VITE_API_URL) {
      const apiUrl = new URL(import.meta.env.VITE_API_URL)
      const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${wsProtocol}//${apiUrl.host}/ws/chat?token=${token}`
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${wsProtocol}//${window.location.host}/ws/chat?token=${token}`
    }

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      set({ ws, isConnected: true })
      console.log('WebSocket connected')
    }

    ws.onclose = () => {
      set({ ws: null, isConnected: false })
      console.log('WebSocket disconnected')

      // Reconnect after 3 seconds
      setTimeout(() => {
        if (!get().ws) {
          get().connectWebSocket()
        }
      }, 3000)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        get().handleWebSocketMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  },

  // Handle incoming WebSocket messages
  handleWebSocketMessage: (data) => {
    const { type } = data

    switch (type) {
      case 'message_sent':
        // Replace temporary message with real one
        {
          const { client_msg_id } = data.message
          set(state => {
            const newMessages = state.messages.map(msg =>
              msg.client_msg_id === client_msg_id
                ? { ...data.message, is_temporary: false }
                : msg
            )
            const newPending = new Map(state.pendingMessages)
            newPending.delete(client_msg_id)
            return { messages: newMessages, pendingMessages: newPending }
          })
          
          // Update conversation
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === data.message.conversation_id
                ? { ...c, last_message: data.message, updated_at: data.message.created_at }
                : c
            ),
          }))
        }
        break

      case 'new_message':
        // New message from someone else
        get().handleNewMessage(data.message)
        break

      case 'message_delivered':
        // Update message status to delivered
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === data.message_id
              ? { ...msg, status: 'delivered', delivered_at: data.delivered_at }
              : msg
          )
        }))
        break

      case 'message_read':
        // Update message status to read
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === data.message_id
              ? { ...msg, status: 'read', read_at: data.read_at, read: true }
              : msg
          )
        }))
        break

      case 'message_reaction_update':
        // Update reactions on message
        set(state => {
          const newPending = new Map(state.pendingReactions)
          newPending.delete(data.message_id)
          
          return {
            messages: state.messages.map(msg =>
              msg.id === data.message_id
                ? { ...msg, reactions: data.reactions }
                : msg
            ),
            pendingReactions: newPending
          }
        })
        break

      case 'message_deleted':
        // Handle message deletion
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === data.message_id
              ? { 
                  ...msg, 
                  is_deleted: true, 
                  content: data.delete_for_everyone ? 'This message was deleted' : msg.content,
                  deleted_for_everyone: data.delete_for_everyone
                }
              : msg
          )
        }))
        break

      case 'user_typing':
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [data.conversation_id]: data.user_id,
          },
        }))
        // Clear after 3 seconds
        setTimeout(() => {
          set((state) => {
            const updated = { ...state.typingUsers }
            delete updated[data.conversation_id]
            return { typingUsers: updated }
          })
        }, 3000)
        break

      case 'user_online':
        set((state) => {
          const updated = new Set(state.onlineUsers)
          updated.add(data.user_id)
          return { onlineUsers: updated }
        })
        break

      case 'user_offline':
        set((state) => {
          const updated = new Set(state.onlineUsers)
          updated.delete(data.user_id)
          return { onlineUsers: updated }
        })
        break

      case 'messages_read':
        // Backward compatibility
        set((state) => ({
          messages: state.messages.map((m) =>
            m.conversation_id === data.conversation_id ? { ...m, read: true, status: 'READ' } : m
          ),
        }))
        break
    }
  },

  // Handle new message
  handleNewMessage: (message) => {
    const { currentConversation } = get()

    // Add to current conversation if viewing
    if (currentConversation?.id === message.conversation_id) {
      set((state) => {
        // Avoid duplicates
        if (state.messages.find((m) => m.id === message.id)) {
          return {}
        }
        return { messages: [...state.messages, message] }
      })

      // Auto-mark as read if viewing
      get().markMessagesAsRead([message.id])
    }

    // Update conversation list
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id === message.conversation_id) {
          const isViewing = currentConversation?.id === c.id
          return {
            ...c,
            last_message: message,
            updated_at: message.created_at,
            unread_count: isViewing ? c.unread_count : c.unread_count + 1,
          }
        }
        return c
      }),
    }))
  },

  // Send typing indicator
  sendTyping: () => {
    const { ws, currentConversation } = get()
    if (!ws || !currentConversation) return

    ws.send(JSON.stringify({
      type: 'typing',
      conversation_id: currentConversation.id,
    }))
  },

  // Disconnect WebSocket
  disconnectWebSocket: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ ws: null, isConnected: false })
    }
  },

  // Check if user is online
  isUserOnline: (userId) => {
    return get().onlineUsers.has(userId)
  },

  // Reset store
  reset: () => {
    get().disconnectWebSocket()
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      pendingMessages: new Map(),
      isLoadingConversations: false,
      isLoadingMessages: false,
      hasMore: false,
      error: null,
      onlineUsers: new Set(),
      typingUsers: {},
      replyingTo: null,
    })
  },
}))

