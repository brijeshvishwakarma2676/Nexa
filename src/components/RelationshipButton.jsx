import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, UserPlus, UserMinus, Clock, Check } from 'lucide-react'
import { useFollowStore } from '../stores/followStore'

/**
 * Relationship Button Component
 * Renders the appropriate button based on relationship status
 * 
 * States:
 * - none: "Follow" button
 * - following: "Following" button (click to unfollow)
 * - pending_sent: "Requested" button (click to cancel)
 * - pending_received: "Accept" button
 */
export default function RelationshipButton({ userId, status, onUpdate }) {
  const { followUser, unfollowUser } = useFollowStore()
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)
  const navigate = useNavigate()

  const handleClick = async () => {
    setLoading(true)
    try {
      if (currentStatus === 'none') {
        const result = await followUser(userId)
        setCurrentStatus(result.relationship_status)
      } else if (currentStatus === 'following' || currentStatus === 'pending_sent') {
        await unfollowUser(userId)
        setCurrentStatus('none')
      } else if (currentStatus === 'pending_received') {
        // Navigate to requests page to handle
        navigate('/requests')
        return
      }

      if (onUpdate) onUpdate(currentStatus)
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Render based on status
  const getButtonConfig = () => {
    switch (currentStatus) {
      case 'following':
        return {
          className: 'btn btn-outline',
          icon: <UserMinus className="w-4 h-4" />,
          text: 'Following'
        }
      case 'pending_sent':
        return {
          className: 'btn btn-outline',
          icon: <Clock className="w-4 h-4" />,
          text: 'Requested'
        }
      case 'pending_received':
        return {
          className: 'btn btn-secondary',
          icon: <Check className="w-4 h-4" />,
          text: 'Accept'
        }
      case 'none':
      default:
        return {
          className: 'btn btn-primary',
          icon: <UserPlus className="w-4 h-4" />,
          text: 'Follow'
        }
    }
  }

  const config = getButtonConfig()

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={config.className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {config.icon}
          {config.text}
        </>
      )}
    </button>
  )
}
