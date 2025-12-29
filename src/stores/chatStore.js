import { create } from 'zustand'
import api from '../services/api'

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  hasMore: false,
  error: null,

  // WebSocket connection
  ws: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: {},

  // Fetch conversations list
  fetchConversations: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await api.get('/conversations')
      set({ conversations: response.data.conversations, isLoading: false })
    } catch (error) {
      set({
        error: error.response?.data?.detail || 'Failed to load conversations',
        isLoading: false
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
    const conversation = get().conversations.find((c) => c.id === conversationId)
    set({ currentConversation: conversation, messages: [], hasMore: false })

    if (conversation) {
      await get().fetchMessages(conversationId)

      // Mark as read
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
    }
  },

  // Fetch messages for conversation
  fetchMessages: async (conversationId, cursor = null) => {
    set({ isLoading: true })

    try {
      const params = { limit: 50 }
      if (cursor) params.cursor = cursor

      const response = await api.get(`/conversations/${conversationId}/messages`, { params })
      const { messages, has_more } = response.data

      set((state) => ({
        messages: cursor ? [...messages, ...state.messages] : messages,
        hasMore: has_more,
        isLoading: false,
      }))
    } catch (error) {
      set({ isLoading: false })
      console.error('Failed to load messages:', error)
    }
  },

  // Send message via REST (WebSocket will also work)
  sendMessage: async (content) => {
    const { currentConversation } = get()
    if (!currentConversation) return

    try {
      const response = await api.post(
        `/conversations/${currentConversation.id}/messages`,
        { content }
      )
      const message = response.data

      // Add to messages
      set((state) => ({
        messages: [...state.messages, message],
      }))

      // Update conversation
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === currentConversation.id
            ? { ...c, last_message: message, updated_at: message.created_at }
            : c
        ),
      }))

      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      return null
    }
  },

  // Connect WebSocket
  connectWebSocket: () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    // Use relative path so Vite proxy handles it in dev, or use absolute in production
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat?token=${token}`
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
      case 'new_message':
      case 'message_sent':
        get().handleNewMessage(data.message)
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
        // Update read status
        set((state) => ({
          messages: state.messages.map((m) =>
            m.conversation_id === data.conversation_id ? { ...m, read: true } : m
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
      isLoading: false,
      hasMore: false,
      error: null,
      onlineUsers: new Set(),
      typingUsers: {},
    })
  },
}))
