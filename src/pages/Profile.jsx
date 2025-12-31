import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, Edit2, UserPlus, UserMinus, Loader2, Grid, MessageSquare, Clock, Check } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import api from '../services/api'
import Post from '../components/Post'

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, updateUser } = useAuthStore()
  const { startConversation } = useChatStore()

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' })

  const isOwner = currentUser?.username === username

  // Fetch profile and posts
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const profileRes = await api.get(`/users/${username}`)
        setProfile(profileRes.data)

        // Initialize edit form
        setEditForm({
          display_name: profileRes.data.display_name || '',
          bio: profileRes.data.bio || ''
        })

        // Fetch posts separately with user ID
        const postsRes = await api.get(`/posts/user/${profileRes.data.id}`, {
          params: { limit: 20 }
        }).catch(() => ({ data: { posts: [] } }))

        setPosts(postsRes.data.posts || [])
      } catch (error) {
        console.error('Failed to load profile:', error)
        if (error.response?.status === 404) {
          // Could handle redirect or show not found
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  // Message handler
  const handleMessage = async () => {
    if (!profile) return
    const conversation = await startConversation(profile.id)
    if (conversation) {
      navigate(`/chat/${conversation.id}`)
    }
  }

  // Follow/Unfollow - handles all relationship states
  const handleFollowToggle = async () => {
    if (!profile) return

    setIsFollowLoading(true)
    try {
      const status = profile.relationship_status || (profile.is_following ? 'following' : 'none')

      if (status === 'following' || status === 'pending_sent') {
        // Unfollow or cancel request
        await api.delete(`/users/${profile.id}/follow`)
        setProfile(prev => ({
          ...prev,
          is_following: false,
          relationship_status: 'none',
          followers_count: status === 'following' ? prev.followers_count - 1 : prev.followers_count
        }))
      } else if (status === 'none') {
        // Send follow request
        const response = await api.post(`/users/${profile.id}/follow`)
        const newStatus = response.data.relationship_status
        setProfile(prev => ({
          ...prev,
          is_following: newStatus === 'following',
          relationship_status: newStatus,
          followers_count: newStatus === 'following' ? prev.followers_count + 1 : prev.followers_count
        }))
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    } finally {
      setIsFollowLoading(false)
    }
  }

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      const response = await api.patch('/users/me', editForm)
      setProfile(prev => ({ ...prev, ...response.data }))
      updateUser(response.data)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  // Upload avatar
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfile(prev => ({ ...prev, ...response.data }))
      updateUser(response.data)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    }
  }

  // Upload cover
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/users/me/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProfile(prev => ({ ...prev, ...response.data }))
      updateUser(response.data)
    } catch (error) {
      console.error('Failed to upload cover:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-(--color-primary) animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card p-12 text-center">
        <h2 className="text-xl font-semibold text-(--color-text-primary)">
          User not found
        </h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="card overflow-hidden">
        {/* Cover Image */}
        <div className="relative h-48 bg-linear-to-r from-(--color-primary) to-(--color-secondary)">
          {profile.cover_url && (
            <img
              src={profile.cover_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}

          {isOwner && (
            <label className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer transition-colors">
              <Camera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Profile Info */}
        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=4F46E5&color=fff&size=128`}
              alt={profile.username}
              className="w-32 h-32 rounded-full avatar ring-4 ring-white"
            />

            {isOwner && (
              <label className="absolute bottom-2 right-2 p-2 rounded-full bg-(--color-primary) text-white hover:bg-(--color-primary-hover) cursor-pointer transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Name and Username */}
          <div className="flex items-start justify-between">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="Display name"
                  className="input mb-2"
                />
              ) : (
                <h1 className="text-2xl font-bold text-(--color-text-primary)">
                  {profile.display_name || profile.username}
                </h1>
              )}
              <p className="text-(--color-text-muted)">@{profile.username}</p>
            </div>

            <div className="flex gap-2">
              {isOwner ? (
                isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProfile}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-outline"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={handleMessage}
                    className="btn btn-secondary"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                  {(() => {
                    const status = profile.relationship_status || (profile.is_following ? 'following' : 'none')

                    if (status === 'following') {
                      return (
                        <button
                          onClick={handleFollowToggle}
                          disabled={isFollowLoading}
                          className="btn btn-outline"
                        >
                          {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                              <UserMinus className="w-4 h-4" />
                              Following
                            </>
                          )}
                        </button>
                      )
                    }

                    if (status === 'pending_sent') {
                      return (
                        <button
                          onClick={handleFollowToggle}
                          disabled={isFollowLoading}
                          className="btn btn-outline"
                        >
                          {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                              <Clock className="w-4 h-4" />
                              Requested
                            </>
                          )}
                        </button>
                      )
                    }

                    if (status === 'pending_received') {
                      return (
                        <button
                          onClick={() => navigate('/requests')}
                          className="btn btn-secondary"
                        >
                          <Check className="w-4 h-4" />
                          Accept Request
                        </button>
                      )
                    }

                    // Default: none - show Follow button
                    return (
                      <button
                        onClick={handleFollowToggle}
                        disabled={isFollowLoading}
                        className="btn btn-primary"
                      >
                        {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </>
                        )}
                      </button>
                    )
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {isEditing ? (
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Write something about yourself..."
              rows={3}
              className="input mt-4"
            />
          ) : profile.bio ? (
            <p className="mt-4 text-(--color-text-secondary)">
              {profile.bio}
            </p>
          ) : null}

          {/* Stats */}
          <div className="flex gap-6 mt-6 pt-4 border-t border-(--color-border)">
            <div className="text-center">
              <p className="text-xl font-bold text-(--color-text-primary)">
                {profile.posts_count}
              </p>
              <p className="text-sm text-(--color-text-muted)">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-(--color-text-primary)">
                {profile.followers_count}
              </p>
              <p className="text-sm text-(--color-text-muted)">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-(--color-text-primary)">
                {profile.following_count}
              </p>
              <p className="text-sm text-(--color-text-muted)">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-(--color-border)">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors ${activeTab === 'posts'
              ? 'text-(--color-primary) border-b-2 border-(--color-primary)'
              : 'text-(--color-text-muted) hover:text-(--color-text-primary)'
              }`}
          >
            <Grid className="w-5 h-5" />
            Posts
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-(--color-text-muted)">
              {isOwner ? "You haven't posted anything yet." : "No posts yet."}
            </p>
          </div>
        ) : (
          posts.map((post) => <Post key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
