import { useState, useRef, useEffect } from 'react'
import { X, Image, Type, Loader2, ChevronLeft, Camera, Sparkles } from 'lucide-react'
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
    { id: 7, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 8, gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
]

export default function CreateStory({ isOpen, onClose }) {
    const { user } = useAuthStore()
    const { addStory, fetchStories } = useStoryStore()

    const [step, setStep] = useState('select') // 'select', 'edit'
    const [mode, setMode] = useState(null) // 'image' or 'text'
    const [imageUrl, setImageUrl] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [textContent, setTextContent] = useState('')
    const [selectedBg, setSelectedBg] = useState(0)
    const [isPosting, setIsPosting] = useState(false)
    const [error, setError] = useState(null)

    const fileInputRef = useRef(null)
    const textInputRef = useRef(null)

    // Focus text input when in text mode
    useEffect(() => {
        if (step === 'edit' && mode === 'text' && textInputRef.current) {
            textInputRef.current.focus()
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
            setError(null)
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
    }

    const handleBack = () => {
        if (step === 'edit') {
            setStep('select')
            setMode(null)
            setImageUrl(null)
            setImageFile(null)
            setTextContent('')
        } else {
            onClose()
        }
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
                    <div className="w-16" /> // Spacer
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                {/* Select Mode */}
                {step === 'select' && (
                    <div className="w-full max-w-md px-6 space-y-4">
                        {/* Photo Option */}
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

                        {/* Text Option */}
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

                {/* Edit Mode - Preview */}
                {step === 'edit' && (
                    <div className="relative w-full h-full flex items-center justify-center px-4">
                        {/* Story Preview Container - 9:16 aspect ratio */}
                        <div
                            className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-[360px] mx-auto"
                            style={{
                                aspectRatio: '9/16',
                                maxHeight: 'calc(100vh - 160px)'
                            }}
                        >
                            {/* Image Preview */}
                            {mode === 'image' && imageUrl && (
                                <img
                                    src={imageUrl}
                                    alt="Story preview"
                                    className="w-full h-full object-cover"
                                />
                            )}

                            {/* Text Preview */}
                            {mode === 'text' && (
                                <div
                                    className="w-full h-full flex items-center justify-center p-6"
                                    style={{ background: BACKGROUND_GRADIENTS[selectedBg].gradient }}
                                >
                                    <textarea
                                        ref={textInputRef}
                                        value={textContent}
                                        onChange={(e) => setTextContent(e.target.value)}
                                        placeholder="Start typing..."
                                        maxLength={280}
                                        className="w-full text-center text-2xl md:text-3xl font-bold text-white bg-transparent border-none outline-none resize-none placeholder:text-white/50"
                                        style={{
                                            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                            height: 'auto',
                                            minHeight: '120px'
                                        }}
                                    />
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
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
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

                        {/* Change Image Button for Image Mode */}
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

            {/* Hidden File Input */}
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
