import { useState, useEffect } from 'react'
import { Loader2, Check, X, UserPlus, Send, Users } from 'lucide-react'
import { useFollowStore } from '../stores/followStore'

/**
 * Friend Requests Page
 * Shows incoming and sent friend requests with Accept/Reject actions
 */
export default function FollowRequests() {
  const [activeTab, setActiveTab] = useState('incoming')
  const [actionLoading, setActionLoading] = useState({})

  const {
    incomingRequests,
    sentRequests,
    requestsLoading,
    fetchIncomingRequests,
    fetchSentRequests,
    acceptRequest,
    rejectRequest,
    cancelRequest
  } = useFollowStore()

  useEffect(() => {
    fetchIncomingRequests()
    fetchSentRequests()
  }, [fetchIncomingRequests, fetchSentRequests])

  const handleAccept = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: 'accept' }))
    try {
      await acceptRequest(requestId)
    } catch (error) {
      console.error('Failed to accept:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }))
    }
  }

  const handleReject = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: 'reject' }))
    try {
      await rejectRequest(requestId)
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }))
    }
  }

  const handleCancel = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: 'cancel' }))
    try {
      await cancelRequest(requestId)
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: null }))
    }
  }

  if (requestsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 px-4 py-3 font-medium text-center transition-colors ${activeTab === 'incoming'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Incoming ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 px-4 py-3 font-medium text-center transition-colors ${activeTab === 'sent'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* Incoming Requests */}
        {activeTab === 'incoming' && (
          incomingRequests.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
              <p className="text-[var(--color-text-muted)]">
                No pending friend requests
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {incomingRequests.map((request) => (
                <div key={request.id} className="p-4 flex items-center gap-4">
                  <img
                    src={request.requester.avatar_url ||
                      `https://ui-avatars.com/api/?name=${request.requester.username}&background=4F46E5&color=fff`}
                    alt={request.requester.username}
                    className="w-12 h-12 rounded-full avatar"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)] truncate">
                      {request.requester.display_name || request.requester.username}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] truncate">
                      @{request.requester.username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={actionLoading[request.id]}
                      className="btn btn-primary px-4"
                    >
                      {actionLoading[request.id] === 'accept' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Accept
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading[request.id]}
                      className="btn btn-outline px-4"
                    >
                      {actionLoading[request.id] === 'reject' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          sentRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Send className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
              <p className="text-[var(--color-text-muted)]">
                No sent requests
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {sentRequests.map((request) => (
                <div key={request.id} className="p-4 flex items-center gap-4">
                  <img
                    src={request.target.avatar_url ||
                      `https://ui-avatars.com/api/?name=${request.target.username}&background=4F46E5&color=fff`}
                    alt={request.target.username}
                    className="w-12 h-12 rounded-full avatar"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)] truncate">
                      {request.target.display_name || request.target.username}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] truncate">
                      @{request.target.username}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(request.id)}
                    disabled={actionLoading[request.id]}
                    className="btn btn-outline px-4"
                  >
                    {actionLoading[request.id] === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Cancel
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
