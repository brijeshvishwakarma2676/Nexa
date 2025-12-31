import { useState, useRef } from 'react'
import { Image, Video, Smile, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useFeedStore } from '../stores/feedStore'
import api from '../services/api'

export default function CreatePost() {
  const { user } = useAuthStore()
  const { addPost } = useFeedStore()

  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
    setIsExpanded(true)
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() && !image) {
      setError('Please write something or add an image')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let imageUrl = null

      if (image) {
        const formData = new FormData()
        formData.append('file', image)

        const uploadResponse = await api.post('/posts/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        imageUrl = uploadResponse.data.image_url
      }

      const response = await api.post('/posts', {
        content: content.trim(),
        image_url: imageUrl,
        visibility: 'public',
      })

      addPost(response.data)

      // Reset form
      setContent('')
      removeImage()
      setIsExpanded(false)
    } catch (error) {
      const detail = error.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to create post')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    if (!isLoading) {
      setIsExpanded(false)
      setContent('')
      removeImage()
      setError('')
    }
  }

  return (
    <>
      {/* Quick Post Input */}
      <div className="bg-white rounded-lg shadow-sm border border-(--color-border) p-3">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
            alt={user?.username}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />

          <button
            onClick={() => setIsExpanded(true)}
            className="flex-1 text-left px-4 py-2.5 bg-(--color-bg) hover:bg-gray-200 rounded-full text-(--color-text-muted) transition-colors text-sm"
          >
            What's going on?
          </button>

          {/* Quick action icons */}
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-(--color-bg) rounded-full transition-colors"
              title="Photo"
            >
              <Image className="w-6 h-6 text-green-500" />
            </button>
            <button
              className="p-2 hover:bg-(--color-bg) rounded-full transition-colors"
              title="Video"
            >
              <Video className="w-6 h-6 text-red-500" />
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 hover:bg-(--color-bg) rounded-full transition-colors"
              title="Feeling"
            >
              <Smile className="w-6 h-6 text-yellow-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Post Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 animate-slideUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-(--color-border)">
              <h2 className="text-xl font-bold text-center flex-1">Create post</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-(--color-bg) rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-(--color-text-muted)" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* User info */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
                  alt={user?.username}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold text-(--color-text-primary)">
                    {user?.display_name || user?.username}
                  </p>
                  <span className="text-xs bg-(--color-bg) px-2 py-0.5 rounded text-(--color-text-muted)">
                    🌐 Public
                  </span>
                </div>
              </div>

              {/* Content textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                // placeholder={`What's on your mind, ${user?.display_name || user?.username}?`}
                placeholder="What's on your mind."
                rows={4}
                autoFocus
                className="w-full resize-none border-none focus:ring-0 bg-transparent text-lg text-(--color-text-primary) placeholder:text-(--color-text-muted)"
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-3 rounded-lg overflow-hidden border border-(--color-border)">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 w-full object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-(--color-error) text-sm mt-3">{error}</p>
              )}

              {/* Add to post */}
              <div className="flex items-center justify-between mt-4 p-3 border border-(--color-border) rounded-lg">
                <span className="text-sm font-medium text-(--color-text-primary)">Add to your post</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-(--color-bg) rounded-full transition-colors"
                  >
                    <Image className="w-6 h-6 text-green-500" />
                  </button>
                  <button className="p-2 hover:bg-(--color-bg) rounded-full transition-colors">
                    <Video className="w-6 h-6 text-red-500" />
                  </button>
                  <button className="p-2 hover:bg-(--color-bg) rounded-full transition-colors">
                    <Smile className="w-6 h-6 text-yellow-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-(--color-border)">
              <button
                onClick={handleSubmit}
                disabled={isLoading || (!content.trim() && !image)}
                className="w-full py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-(--color-primary) text-white hover:bg-(--color-primary-dark)"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
