import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Camera, Edit2, UserPlus, UserMinus, Loader2, MessageSquare,
  Clock, Check, X, Lock, MapPin, Briefcase, GraduationCap,
  Home, Heart, Globe, Plus, MoreHorizontal, Images, Users, ArrowLeft
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import api from '../services/api'
import Post from '../components/Post'
import PostModal from '../components/PostModal'
import toast from 'react-hot-toast'

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, updateUser } = useAuthStore()
  const { startConversation } = useChatStore()

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [photos, setPhotos] = useState([])
  const [friends, setFriends] = useState({ friends: [], total: 0 })
  const [following, setFollowing] = useState({ following: [], total: 0 })
  const [followingSearch, setFollowingSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [editForm, setEditForm] = useState({
    display_name: '', bio: '', is_private: false,
    workplace: '', education: '', location: '', hometown: '',
    relationship_status: '', website: ''
  })

  const isOwner = currentUser?.username === username

  // Tabs
  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'about', label: 'About' },
    { id: 'friends', label: 'Friends' },
    { id: 'following', label: 'Following' },
    { id: 'photos', label: 'Photos' },
  ]

  // Fetch profile data
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      try {
        const profileRes = await api.get(`/users/${username}`)
        setProfile(profileRes.data)

        setEditForm({
          display_name: profileRes.data.display_name || '',
          bio: profileRes.data.bio || '',
          is_private: profileRes.data.is_private || false,
          workplace: profileRes.data.workplace || '',
          education: profileRes.data.education || '',
          location: profileRes.data.location || '',
          hometown: profileRes.data.hometown || '',
          relationship_status: profileRes.data.user_relationship_status || '',
          website: profileRes.data.website || ''
        })

        // Fetch posts
        const postsRes = await api.get(`/posts/user/${profileRes.data.id}`, { params: { limit: 20 } })
          .catch(() => ({ data: { posts: [] } }))
        setPosts(postsRes.data.posts || [])

        // Fetch photos, friends, and following
        const [photosRes, friendsRes, followingRes] = await Promise.all([
          api.get(`/users/${profileRes.data.id}/photos`).catch(() => ({ data: { photos: [] } })),
          api.get(`/users/${profileRes.data.id}/friends`).catch(() => ({ data: { friends: [], total: 0 } })),
          api.get(`/users/${profileRes.data.id}/following`).catch(() => ({ data: [] }))
        ])
        setPhotos(photosRes.data.photos || [])
        setFriends(friendsRes.data)
        // Following API returns a plain array, not an object
        const followingList = Array.isArray(followingRes.data) ? followingRes.data : []
        setFollowing({ following: followingList, total: followingList.length })

      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [username])

  const handleMessage = async () => {
    if (!profile) return
    const conversation = await startConversation(profile.id)
    if (conversation) navigate(`/chat/${conversation.id}`)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    setIsFollowLoading(true)
    try {
      const status = profile.relationship_status || (profile.is_following ? 'following' : 'none')
      if (status === 'following' || status === 'pending_sent') {
        await api.delete(`/users/${profile.id}/follow`)
        setProfile(prev => ({ ...prev, is_following: false, relationship_status: 'none' }))
      } else {
        const response = await api.post(`/users/${profile.id}/follow`)
        setProfile(prev => ({ ...prev, relationship_status: response.data.relationship_status }))
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    } finally {
      setIsFollowLoading(false)
    }
  }

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
      toast.success('Avatar updated successfully!')
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      toast.error('Failed to update avatar.')
    }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Frontend validation for dimensions
    const img = new Image()
    img.src = URL.createObjectURL(file)
    img.onload = async () => {
      const width = img.width
      const height = img.height

      // Ideal dimensions: 851 x 315
      if (width < 400 || height < 150) {
        toast.error('Image is too small for a cover photo. Minimum 400x150 recommended.')
        return
      }

      if (width < 851 || height < 315) {
        toast.loading('Image is smaller than recommended (851x315). It might look blurry.', { duration: 3000 })
      }

      const formData = new FormData()
      formData.append('file', file)
      const uploadToast = toast.loading('Uploading and processing cover photo...')

      try {
        const response = await api.post('/users/me/cover', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setProfile(prev => ({ ...prev, ...response.data }))
        updateUser(response.data)
        toast.success('Cover photo updated and optimized!', { id: uploadToast })
      } catch (error) {
        console.error('Failed to upload cover:', error)
        toast.error('Failed to update cover photo.', { id: uploadToast })
      }
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
        <h2 className="text-xl font-semibold text-(--color-text-primary)">User not found</h2>
      </div>
    )
  }

  const relationshipStatus = profile.relationship_status || (profile.is_following ? 'following' : 'none')

  return (
    <div className="mx-auto" style={{ maxWidth: '1100px' }}>
      {/* Cover Photo - Facebook style with ideal 851:315 ratio */}
      <div className="relative h-[250px] md:h-[407px] bg-linear-to-r from-gray-200 to-gray-300 rounded-b-xl overflow-hidden shadow-sm group">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-200 z-10 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-r from-blue-400 via-indigo-400 to-purple-500 opacity-80" />
        )}

        {isOwner && (
          <label className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg cursor-pointer hover:bg-white transition-all font-semibold text-sm border border-gray-200/50">
            <Camera className="w-4 h-4" />
            <span className="hidden md:inline">Edit cover photo</span>
            <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          </label>
        )}
      </div>

      {/* Profile Header */}
      <div className="relative px-4 md:px-8 pb-4 bg-(--color-card) border-b border-(--color-border)">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Avatar */}
          <div className="relative -mt-20 md:-mt-24 shrink-0">
            <img
              src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || profile.username)}&background=4F46E5&color=fff&size=168`}
              alt={profile.username}
              className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white shadow-lg object-cover bg-white"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || profile.username)}&background=4F46E5&color=fff&size=168`
              }}
            />
            {isOwner && (
              <label className="absolute bottom-2 right-2 p-2 bg-(--color-bg) rounded-full shadow cursor-pointer hover:bg-gray-200 transition">
                <Camera className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Name & Actions */}
          <div className="flex-1 md:ml-4 pb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-(--color-text-primary) flex items-center gap-2">
              {profile.display_name || profile.username}
              {profile.is_private && <Lock className="w-5 h-5 text-(--color-text-muted)" />}
            </h1>
            <p className="text-(--color-text-muted) mb-2">
              {friends.total} friends · {profile.followers_count ?? 0} followers · {following.total} following
            </p>

            {/* Friend avatars preview */}
            {friends.friends.length > 0 && (
              <div className="flex -space-x-2">
                {friends.friends.slice(0, 8).map(f => (
                  <img
                    key={f.id}
                    src={f.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.display_name || f.username)}&size=32&background=4F46E5&color=fff`}
                    alt={f.username}
                    className="w-8 h-8 rounded-full border-2 border-white object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.display_name || f.username)}&size=32&background=4F46E5&color=fff`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pb-4">
            {isOwner ? (
              <>
                <button className="btn btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add to story
                </button>
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Edit profile
                </button>
              </>
            ) : (
              <>
                {relationshipStatus === 'following' ? (
                  <button onClick={handleFollowToggle} disabled={isFollowLoading} className="btn btn-secondary flex items-center gap-2">
                    {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Friends</>}
                  </button>
                ) : relationshipStatus === 'pending_sent' ? (
                  <button onClick={handleFollowToggle} disabled={isFollowLoading} className="btn btn-outline flex items-center gap-2">
                    {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-4 h-4" /> Requested</>}
                  </button>
                ) : (
                  <button onClick={handleFollowToggle} disabled={isFollowLoading} className="btn btn-primary flex items-center gap-2">
                    {isFollowLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Add friend</>}
                  </button>
                )}
                <button onClick={handleMessage} className="btn btn-secondary flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-2 border-t border-(--color-border) pt-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-2 md:px-4 md:py-3 text-sm md:text-base font-medium rounded-lg transition whitespace-nowrap ${activeTab === tab.id
                ? 'text-(--color-primary) border-b-2 border-(--color-primary)'
                : 'text-(--color-text-muted) hover:bg-(--color-bg)'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        {/* Left Sidebar */}
        <div className="w-full lg:w-[360px] space-y-4 shrink-0">
          {/* Intro Card */}
          <div className="card p-4">
            <h3 className="text-xl font-bold text-(--color-text-primary) mb-4">Intro</h3>

            {profile.bio && (
              <p className="text-center text-(--color-text-secondary) mb-4">{profile.bio}</p>
            )}

            <div className="space-y-3">
              {profile.workplace && (
                <div className="flex items-center gap-3 text-(--color-text-secondary)">
                  <Briefcase className="w-5 h-5 text-(--color-text-muted)" />
                  <span>Works at <strong>{profile.workplace}</strong></span>
                </div>
              )}
              {profile.education && (
                <div className="flex items-center gap-3 text-(--color-text-secondary)">
                  <GraduationCap className="w-5 h-5 text-(--color-text-muted)" />
                  <span>Studied at <strong>{profile.education}</strong></span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-3 text-(--color-text-secondary)">
                  <MapPin className="w-5 h-5 text-(--color-text-muted)" />
                  <span>Lives in <strong>{profile.location}</strong></span>
                </div>
              )}
              {profile.hometown && (
                <div className="flex items-center gap-3 text-(--color-text-secondary)">
                  <Home className="w-5 h-5 text-(--color-text-muted)" />
                  <span>From <strong>{profile.hometown}</strong></span>
                </div>
              )}
              {profile.user_relationship_status && (
                <div className="flex items-center gap-3 text-(--color-text-secondary)">
                  <Heart className="w-5 h-5 text-(--color-text-muted)" />
                  <span>{profile.user_relationship_status}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-3 text-(--color-text-secondary)">
                  <Globe className="w-5 h-5 text-(--color-text-muted)" />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-(--color-primary) hover:underline">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            {/* Empty state when no intro details */}
            {!profile.bio && !profile.workplace && !profile.education && !profile.location && !profile.hometown && !profile.user_relationship_status && !profile.website && (
              <p className="text-center text-(--color-text-muted) py-4">No intro added yet</p>
            )}

            {isOwner && (
              <button onClick={() => { setActiveTab('about'); setIsEditing(true) }} className="w-full mt-4 btn btn-secondary">
                Edit details
              </button>
            )}
          </div>

          {/* Photos Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-(--color-text-primary)">Photos</h3>
              <button onClick={() => setActiveTab('photos')} className="text-(--color-primary) hover:underline text-sm">
                See all photos
              </button>
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                {photos.slice(0, 9).map(photo => (
                  <img key={photo.id} src={photo.url} alt="" className="aspect-square object-cover hover:opacity-90 transition cursor-pointer" />
                ))}
              </div>
            ) : (
              <p className="text-center text-(--color-text-muted) py-4">No photos yet</p>
            )}
          </div>

          {/* Friends Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-(--color-text-primary)">Friends</h3>
                <p className="text-sm text-(--color-text-muted)">{friends.total} friends</p>
              </div>
              <button onClick={() => setActiveTab('friends')} className="text-(--color-primary) hover:underline text-sm">
                See all friends
              </button>
            </div>
            {friends.friends.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {friends.friends.slice(0, 9).map(friend => {
                  const avatarUrl = friend.avatar_url && friend.avatar_url.trim() !== ''
                    ? friend.avatar_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.display_name || friend.username)}&size=100&background=4F46E5&color=fff`
                  return (
                    <div key={friend.id} onClick={() => navigate(`/profile/${friend.username}`)} className="cursor-pointer text-center">
                      <img
                        src={avatarUrl}
                        alt={friend.username}
                        className="w-full aspect-square rounded-lg object-cover bg-(--color-bg)"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.display_name || friend.username)}&size=100&background=4F46E5&color=fff`
                        }}
                      />
                      <p className="text-xs font-medium text-(--color-text-primary) mt-1 truncate px-1">
                        {friend.display_name || friend.username}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-(--color-text-muted) py-4">No friends yet</p>
            )}
          </div>

          {/* Following Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-(--color-text-primary)">Following</h3>
                <p className="text-sm text-(--color-text-muted)">{following.total || 0} following</p>
              </div>
              <button onClick={() => setActiveTab('following')} className="text-(--color-primary) hover:underline text-sm">
                See all
              </button>
            </div>
            {(following.following || []).length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {(following.following || []).slice(0, 9).map(user => {
                  const avatarUrl = user.avatar_url && user.avatar_url.trim() !== ''
                    ? user.avatar_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&size=100&background=4F46E5&color=fff`
                  return (
                    <div key={user.id} onClick={() => navigate(`/profile/${user.username}`)} className="cursor-pointer text-center">
                      <img
                        src={avatarUrl}
                        alt={user.username}
                        className="w-full aspect-square rounded-lg object-cover bg-(--color-bg)"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&size=100&background=4F46E5&color=fff`
                        }}
                      />
                      <p className="text-xs font-medium text-(--color-text-primary) mt-1 truncate px-1">
                        {user.display_name || user.username}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-(--color-text-muted) py-4">Not following anyone yet</p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {activeTab === 'posts' && (
            <>
              {!profile.is_accessible ? (
                <div className="card p-12 text-center">
                  <Lock className="w-16 h-16 mx-auto text-(--color-text-muted) mb-4" />
                  <h3 className="text-xl font-semibold text-(--color-text-primary) mb-2">This Account is Private</h3>
                  <p className="text-(--color-text-muted)">Follow this account to see their posts.</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="card p-12 text-center">
                  <p className="text-(--color-text-muted)">{isOwner ? "You haven't posted anything yet." : "No posts yet."}</p>
                </div>
              ) : (
                posts.map(post => <Post key={post.id} post={post} />)
              )}
            </>
          )}

          {activeTab === 'about' && (
            <div className="card p-6">
              <h3 className="text-xl font-bold text-(--color-text-primary) mb-6">About</h3>

              {isEditing && isOwner ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Display Name</label>
                    <input type="text" value={editForm.display_name} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })} className="input" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Bio</label>
                    <textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} className="input" rows={3} placeholder="Write something about yourself" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Workplace</label>
                    <input type="text" value={editForm.workplace} onChange={e => setEditForm({ ...editForm, workplace: e.target.value })} className="input" placeholder="Where do you work?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Education</label>
                    <input type="text" value={editForm.education} onChange={e => setEditForm({ ...editForm, education: e.target.value })} className="input" placeholder="Where did you study?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Current City</label>
                    <input type="text" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className="input" placeholder="Where do you live?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Hometown</label>
                    <input type="text" value={editForm.hometown} onChange={e => setEditForm({ ...editForm, hometown: e.target.value })} className="input" placeholder="Where are you from?" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Relationship Status</label>
                    <select value={editForm.relationship_status} onChange={e => setEditForm({ ...editForm, relationship_status: e.target.value })} className="input">
                      <option value="">Select status</option>
                      <option value="Single">Single</option>
                      <option value="In a relationship">In a relationship</option>
                      <option value="Engaged">Engaged</option>
                      <option value="Married">Married</option>
                      <option value="Complicated">It's complicated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">Website</label>
                    <input type="url" value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="input" placeholder="https://yourwebsite.com" />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button onClick={() => setIsEditing(false)} className="btn btn-outline">Cancel</button>
                    <button onClick={handleUpdateProfile} className="btn btn-primary">Save changes</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.bio && <p className="text-(--color-text-secondary)">{profile.bio}</p>}
                  {profile.workplace && <p><Briefcase className="inline w-4 h-4 mr-2" /> Works at {profile.workplace}</p>}
                  {profile.education && <p><GraduationCap className="inline w-4 h-4 mr-2" /> Studied at {profile.education}</p>}
                  {profile.location && <p><MapPin className="inline w-4 h-4 mr-2" /> Lives in {profile.location}</p>}
                  {profile.hometown && <p><Home className="inline w-4 h-4 mr-2" /> From {profile.hometown}</p>}
                  {profile.user_relationship_status && <p><Heart className="inline w-4 h-4 mr-2" /> {profile.user_relationship_status}</p>}
                  {profile.website && <p><Globe className="inline w-4 h-4 mr-2" /> <a href={profile.website} className="text-(--color-primary)">{profile.website}</a></p>}

                  {isOwner && <button onClick={() => setIsEditing(true)} className="btn btn-secondary mt-4">Edit details</button>}
                </div>
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="card p-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-(--color-text-primary)">Friends</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search"
                    className="px-3 py-1.5 text-sm bg-(--color-bg) rounded-full border border-(--color-border) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
                  />
                </div>
              </div>

              {friends.friends.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {friends.friends.map(friend => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-(--color-border) hover:bg-(--color-bg) transition cursor-pointer"
                    >
                      <img
                        src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.username}&size=80`}
                        alt={friend.username}
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                        onClick={() => navigate(`/profile/${friend.username}`)}
                      />
                      <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${friend.username}`)}>
                        <p className="font-semibold text-(--color-text-primary) truncate">
                          {friend.display_name || friend.username}
                        </p>
                        <p className="text-sm text-(--color-text-muted)">
                          {Math.floor(Math.random() * 50) + 1} mutual friends
                        </p>
                      </div>
                      <button className="p-2 hover:bg-(--color-border) rounded-full transition shrink-0">
                        <MoreHorizontal className="w-5 h-5 text-(--color-text-muted)" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-(--color-text-muted) py-8">No friends yet</p>
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div className="card p-4 md:p-4">
              {/* Header - stacks on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-lg md:text-xl font-bold text-(--color-text-primary)">Following</h3>
                <input
                  type="text"
                  placeholder="Search"
                  value={followingSearch}
                  onChange={(e) => setFollowingSearch(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm bg-(--color-bg) rounded-full border border-(--color-border) focus:outline-none focus:ring-2 focus:ring-(--color-primary)"
                />
              </div>

              {(() => {
                const filteredFollowing = (following.following || []).filter(user =>
                  !followingSearch ||
                  user.display_name?.toLowerCase().includes(followingSearch.toLowerCase()) ||
                  user.username.toLowerCase().includes(followingSearch.toLowerCase())
                )
                return filteredFollowing.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredFollowing.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border border-(--color-border) hover:bg-(--color-bg) transition cursor-pointer"
                      >
                        <img
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&size=80&background=4F46E5&color=fff`}
                          alt={user.username}
                          className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover shrink-0"
                          referrerPolicy="no-referrer"
                          onClick={() => navigate(`/profile/${user.username}`)}
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&size=80&background=4F46E5&color=fff`
                          }}
                        />
                        <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${user.username}`)}>
                          <p className="font-semibold text-sm md:text-base text-(--color-text-primary) truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs md:text-sm text-(--color-text-muted) truncate">
                            @{user.username}
                          </p>
                        </div>
                        <button className="p-1.5 md:p-2 hover:bg-(--color-border) rounded-full transition shrink-0">
                          <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5 text-(--color-text-muted)" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-(--color-text-muted) py-6 md:py-8 text-sm md:text-base">
                    {followingSearch ? 'No matching users found' : 'Not following anyone yet'}
                  </p>
                )
              })()}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="card p-6">
              <h3 className="text-xl font-bold text-(--color-text-primary) mb-4">Photos</h3>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {photos.map(photo => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt=""
                      className="aspect-square object-cover rounded-lg hover:opacity-90 transition cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-(--color-text-muted) py-8">No photos yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PostModal
          post={{
            id: selectedPhoto.post_id || selectedPhoto.id,
            author: {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url
            },
            content: '',
            image_url: selectedPhoto.url,
            created_at: selectedPhoto.created_at || new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
            is_liked: false,
            visibility: 'public'
          }}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  )
}
