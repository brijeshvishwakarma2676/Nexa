import { useState, useRef, useEffect } from 'react'
import { X, Type, Loader2, ChevronLeft, Camera, Sparkles, Move } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

const BACKGROUND_GRADIENTS = [
    { id: 1, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 2, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 3, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 4, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: 5, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { id: 6, gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { id: 7, gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)' },
    { id: 8, gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
]

export default function CreateStory({ isOpen, onClose }) {
    const { user } = useAuthStore()
    const { addStory, fetchStories } = useStoryStore()

    const [step, setStep] = useState('select')
    const [mode, setMode] = useState(null)
    const [imageUrl, setImageUrl] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [textContent, setTextContent] = useState('')
    const [selectedBg, setSelectedBg] = useState(0)
    const [isPosting, setIsPosting] = useState(false)
    const [error, setError] = useState(null)

    // Text position state (percentage-based for responsiveness)
    const [textPosition, setTextPosition] = useState({ x: 50, y: 50 })
    const [isDragging, setIsDragging] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const fileInputRef = useRef(null)
    const textInputRef = useRef(null)
    const containerRef = useRef(null)
    const dragStartRef = useRef({ x: 0, y: 0 })

    // Focus text input when entering edit mode
    useEffect(() => {
        if (step === 'edit' && mode === 'text') {
            setIsEditing(true)
        }
    }, [step, mode])

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('select')
            setMode(null)
            setImageUrl(null)
            setImageFile(null)
            setTextContent('')
            setSelectedBg(0)
            setTextPosition({ x: 50, y: 50 })
            setError(null)
            setIsEditing(false)
        }
    }, [isOpen])

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
        setStep('edit')
        setError(null)
    }

    const handleTextMode = () => {
        setMode('text')
        setStep('edit')
        setTextPosition({ x: 50, y: 50 })
    }

    const handleBack = () => {
        if (step === 'edit') {
            setStep('select')
            setMode(null)
            setImageUrl(null)
            setImageFile(null)
            setTextContent('')
            setTextPosition({ x: 50, y: 50 })
        } else {
            onClose()
        }
    }

    // Drag handlers
    const getPositionFromEvent = (e, container) => {
        const rect = container.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        const x = ((clientX - rect.left) / rect.width) * 100
        const y = ((clientY - rect.top) / rect.height) * 100

        return {
            x: Math.max(10, Math.min(90, x)),
            y: Math.max(10, Math.min(90, y))
        }
    }

    const handleDragStart = (e) => {
        if (isEditing) return
        e.preventDefault()
        setIsDragging(true)

        const container = containerRef.current
        if (!container) return

        const pos = getPositionFromEvent(e, container)
        dragStartRef.current = pos
    }

    const handleDragMove = (e) => {
        if (!isDragging || !containerRef.current) return
        e.preventDefault()

        const pos = getPositionFromEvent(e, containerRef.current)
        setTextPosition(pos)
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    const handleTextClick = () => {
        if (!isDragging) {
            setIsEditing(true)
            setTimeout(() => textInputRef.current?.focus(), 50)
        }
    }

    const handleTextBlur = () => {
        setIsEditing(false)
    }

    const handlePost = async () => {
        if (mode === 'image' && !imageFile) return
        if (mode === 'text' && !textContent.trim()) return

        setIsPosting(true)
        setError(null)

        try {
            let storyImageUrl = null

            if (mode === 'image' && imageFile) {
                const formData = new FormData()
                formData.append('file', imageFile)

                const uploadResponse = await api.post('/stories/upload-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                storyImageUrl = uploadResponse.data.image_url
            }

            const storyData = {
                content: mode === 'text' ? textContent : null,
                image_url: storyImageUrl
            }

            const response = await api.post('/stories', storyData)
            addStory(response.data, user)
            await fetchStories()
            onClose()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create story')
        } finally {
            setIsPosting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm z-10">
                <button
                    onClick={handleBack}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    {step === 'select' ? (
                        <X className="w-6 h-6 text-white" />
                    ) : (
                        <ChevronLeft className="w-6 h-6 text-white" />
                    )}
                </button>

                <h2 className="text-white font-semibold text-lg">
                    {step === 'select' ? 'Create Story' : mode === 'image' ? 'Edit Photo' : 'Create Text'}
                </h2>

                {step === 'edit' ? (
                    <button
                        onClick={handlePost}
                        disabled={isPosting || (mode === 'text' && !textContent.trim())}
                        className="px-4 py-2 bg-white text-black font-semibold rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isPosting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Share'
                        )}
                    </button>
                ) : (
                    <div className="w-16" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                {/* Select Mode */}
                {step === 'select' && (
                    <div className="w-full max-w-md px-6 space-y-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                    <Camera className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-bold text-lg">Photo Story</p>
                                    <p className="text-white/70 text-sm">Share a moment with an image</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={handleTextMode}
                            className="w-full p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                    <Type className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-bold text-lg">Text Story</p>
                                    <p className="text-white/70 text-sm">Express yourself with words</p>
                                </div>
                            </div>
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

                {/* Edit Mode */}
                {step === 'edit' && (
                    <div className="relative w-full h-full flex items-center justify-center px-4">
                        {/* Story Preview Container */}
                        <div
                            ref={containerRef}
                            className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-[360px] mx-auto touch-none"
                            style={{
                                aspectRatio: '9/16',
                                maxHeight: 'calc(100vh - 160px)'
                            }}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                            onTouchMove={handleDragMove}
                            onTouchEnd={handleDragEnd}
                        >
                            {/* Image Preview */}
                            {mode === 'image' && imageUrl && (
                                <img
                                    src={imageUrl}
                                    alt="Story preview"
                                    className="w-full h-full object-cover"
                                />
                            )}

                            {/* Text Story Background */}
                            {mode === 'text' && (
                                <div
                                    className="w-full h-full"
                                    style={{ background: BACKGROUND_GRADIENTS[selectedBg].gradient }}
                                    onClick={() => !isEditing && setIsEditing(true)}
                                />
                            )}

                            {/* Draggable Text Element */}
                            {mode === 'text' && (
                                <div
                                    className={`absolute cursor-move select-none ${isDragging ? 'scale-105' : ''} transition-transform`}
                                    style={{
                                        left: `${textPosition.x}%`,
                                        top: `${textPosition.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        maxWidth: '80%',
                                        zIndex: 20
                                    }}
                                    onMouseDown={handleDragStart}
                                    onTouchStart={handleDragStart}
                                    onClick={handleTextClick}
                                >
                                    {isEditing ? (
                                        <textarea
                                            ref={textInputRef}
                                            value={textContent}
                                            onChange={(e) => setTextContent(e.target.value)}
                                            onBlur={handleTextBlur}
                                            placeholder="Tap to type..."
                                            maxLength={280}
                                            autoFocus
                                            className="text-center text-xl md:text-2xl font-bold text-white bg-black/30 backdrop-blur-sm rounded-xl p-4 border-2 border-white/50 outline-none resize-none w-64 md:w-72"
                                            style={{
                                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                                minHeight: '80px'
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="text-center text-xl md:text-2xl font-bold text-white px-4 py-3 rounded-xl bg-black/20 backdrop-blur-sm min-w-[120px]"
                                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                                        >
                                            {textContent || 'Tap to type'}
                                            <div className="flex items-center justify-center gap-1 mt-2 text-white/60 text-xs">
                                                <Move className="w-3 h-3" />
                                                <span>Drag to move</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* User Avatar Overlay */}
                            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                                <img
                                    src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username}&background=4F46E5&color=fff`}
                                    alt={user?.username}
                                    className="w-8 h-8 rounded-full ring-2 ring-white"
                                />
                                <span className="text-white font-medium text-sm drop-shadow-lg">
                                    Your Story
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/30 rounded-full" />
                        </div>

                        {/* Background Selector for Text Mode */}
                        {mode === 'text' && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto pb-2">
                                {BACKGROUND_GRADIENTS.map((bg, index) => (
                                    <button
                                        key={bg.id}
                                        onClick={() => setSelectedBg(index)}
                                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0 transition-transform ${selectedBg === index ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-105'
                                            }`}
                                        style={{ background: bg.gradient }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Change Image Button */}
                        {mode === 'image' && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Change Photo
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-20 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-xl text-center text-sm">
                    {error}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
            />
        </div>
    )
}
