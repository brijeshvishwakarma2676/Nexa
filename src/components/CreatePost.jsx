import { useState, useRef } from 'react'
import { Image, Send, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useFeedStore } from '../stores/feedStore'
import api from '../services/api'

export default function CreatePost() {
  const { user } = useAuthStore()
  const { addPost } = useFeedStore()

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
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!content.trim() && !image) {
      setError('Please write something or add an image')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let imageUrl = null

      // Upload image first if exists
      if (image) {
        const formData = new FormData()
        formData.append('file', image)

        const uploadResponse = await api.post('/posts/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        imageUrl = uploadResponse.data.image_url
      }

      // Create post
      const response = await api.post('/posts', {
        content: content.trim(),
        image_url: imageUrl,
        visibility: 'public',
      })

      // Add to feed
      addPost(response.data)

      // Reset form
      setContent('')
      removeImage()
    } catch (error) {
      const detail = error.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic validation errors
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

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <img
          src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
          alt={user?.username}
          className="w-10 h-10 rounded-full avatar flex-shrink-0"
        />

        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full resize-none border-none focus:ring-0 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-base"
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-lg overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 w-full object-cover rounded-lg"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-[var(--color-error)] text-sm mt-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost p-2"
                title="Add image"
              >
                <Image className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || (!content.trim() && !image)}
              className="btn btn-primary"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
