import { useState, useRef } from 'react'
import { X, Image, Type, Loader2, Trash2 } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const BACKGROUND_COLORS = [
    'bg-gradient-to-br from-purple-600 to-indigo-600',
    'bg-gradient-to-br from-pink-500 to-rose-500',
    'bg-gradient-to-br from-blue-500 to-cyan-500',
    'bg-gradient-to-br from-green-500 to-emerald-500',
    'bg-gradient-to-br from-orange-500 to-amber-500',
    'bg-gradient-to-br from-gray-700 to-gray-900',
]

export default function CreateStory({ isOpen, onClose }) {
    const { user } = useAuthStore()
    const { addStory, fetchStories } = useStoryStore()

    const [mode, setMode] = useState(null) // 'image' or 'text'
    const [imageUrl, setImageUrl] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [textContent, setTextContent] = useState('')
    const [selectedBg, setSelectedBg] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [isPosting, setIsPosting] = useState(false)
    const [error, setError] = useState(null)

    const fileInputRef = useRef(null)

    const handleImageSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB')
            return
        }

        setImageFile(file)
        setImageUrl(URL.createObjectURL(file))
        setMode('image')
        setError(null)
    }

    const handleTextMode = () => {
        setMode('text')
        setImageUrl(null)
        setImageFile(null)
    }

    const handleClear = () => {
        setMode(null)
        setImageUrl(null)
        setImageFile(null)
        setTextContent('')
        setError(null)
    }

    const handlePost = async () => {
        if (mode === 'image' && !imageFile) return
        if (mode === 'text' && !textContent.trim()) return

        setIsPosting(true)
        setError(null)

        try {
            let storyImageUrl = null

            // Upload image if in image mode
            if (mode === 'image' && imageFile) {
                setIsUploading(true)
                const formData = new FormData()
                formData.append('file', imageFile)

                const uploadResponse = await api.post('/stories/upload-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                storyImageUrl = uploadResponse.data.image_url
                setIsUploading(false)
            }

            // Create story
            const storyData = {
                content: mode === 'text' ? textContent : null,
                image_url: storyImageUrl
            }

            const response = await api.post('/stories', storyData)

            // Add to local state
            addStory(response.data, user)

            // Refresh stories
            await fetchStories()

            // Reset and close
            handleClear()
            onClose()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create story')
        } finally {
            setIsPosting(false)
            setIsUploading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black z-50 flex">
            {/* Left Panel - Controls */}
            <div className="w-80 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Create Story</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-[var(--color-bg)] transition-colors"
                    >
                        <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </button>
                </div>

                {/* Mode Selection */}
                {!mode && (
                    <div className="flex-1 p-4 space-y-4">
                        <p className="text-[var(--color-text-muted)] text-sm mb-4">
                            Choose what type of story you want to create
                        </p>

                        {/* Image Option */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-3">
                                <Image className="w-8 h-8 text-[var(--color-primary)]" />
                            </div>
                            <p className="font-semibold text-[var(--color-text-primary)]">Photo Story</p>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                Upload an image (9:16 recommended)
                            </p>
                        </button>

                        {/* Text Option */}
                        <button
                            onClick={handleTextMode}
                            className="w-full p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-secondary)] hover:bg-[var(--color-secondary-light)] transition-colors text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-[var(--color-secondary-light)] flex items-center justify-center mx-auto mb-3">
                                <Type className="w-8 h-8 text-[var(--color-secondary)]" />
                            </div>
                            <p className="font-semibold text-[var(--color-text-primary)]">Text Story</p>
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                Create a colorful text story
                            </p>
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Text Mode Controls */}
                {mode === 'text' && (
                    <div className="flex-1 p-4 space-y-4">
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Discard</span>
                        </button>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                                Your text
                            </label>
                            <textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                                placeholder="Start typing..."
                                maxLength={280}
                                className="w-full h-32 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            />
                            <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right">
                                {textContent.length}/280
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                                Background
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {BACKGROUND_COLORS.map((bg, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedBg(index)}
                                        className={`w-10 h-10 rounded-lg ${bg} ${selectedBg === index ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)]' : ''
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Mode Controls */}
                {mode === 'image' && (
                    <div className="flex-1 p-4 space-y-4">
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Discard</span>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
                        >
                            Change Image
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="px-4 py-2 bg-red-100 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Post Button */}
                {mode && (
                    <div className="p-4 border-t border-[var(--color-border)]">
                        <button
                            onClick={handlePost}
                            disabled={isPosting || (mode === 'text' && !textContent.trim()) || (mode === 'image' && !imageFile)}
                            className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isPosting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {isUploading ? 'Uploading...' : 'Posting...'}
                                </>
                            ) : (
                                'Share to Story'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 flex items-center justify-center bg-gray-900 p-8">
                {/* 9:16 Preview Container */}
                <div
                    className="relative rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                        width: 'min(360px, 90vw)',
                        aspectRatio: '9/16',
                        maxHeight: '90vh'
                    }}
                >
                    {/* Preview Content */}
                    {!mode && (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                            <p className="text-white/50 text-center px-8">
                                Select an option to start creating your story
                            </p>
                        </div>
                    )}

                    {mode === 'image' && imageUrl && (
                        <img
                            src={imageUrl}
                            alt="Story preview"
                            className="w-full h-full object-cover"
                        />
                    )}

                    {mode === 'text' && (
                        <div className={`w-full h-full ${BACKGROUND_COLORS[selectedBg]} flex items-center justify-center p-8`}>
                            <p className="text-white text-2xl font-bold text-center leading-relaxed drop-shadow-lg">
                                {textContent || 'Your text will appear here'}
                            </p>
                        </div>
                    )}

                    {/* User Avatar Overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                        <img
                            src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
                            alt={user?.username}
                            className="w-10 h-10 rounded-full ring-2 ring-white"
                        />
                        <span className="text-white font-medium text-sm drop-shadow-lg">
                            {user?.display_name || user?.username}
                        </span>
                    </div>

                    {/* Progress Bar Placeholder */}
                    <div className="absolute top-2 left-2 right-2 h-1 bg-white/30 rounded-full" />
                </div>
            </div>
        </div>
    )
}
