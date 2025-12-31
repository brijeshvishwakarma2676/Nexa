import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Type, Loader2, ChevronLeft, Camera, Sparkles, Plus, Trash2 } from 'lucide-react'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

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

const MIN_SCALE = 0.3
const MAX_SCALE = 3.0

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT LAYER COMPONENT
// Individual text element with drag/resize/rotate via pointer events
// ═══════════════════════════════════════════════════════════════════════════════

function TextLayer({ layer, isSelected, onSelect, onUpdate, onDelete, onEdit, containerRef }) {
    const elementRef = useRef(null)
    const pointersRef = useRef(new Map()) // Track active pointers
    const lastTapRef = useRef(0) // For double-tap detection
    const gestureRef = useRef({
        startX: 0, startY: 0,
        startLayerX: 0, startLayerY: 0,
        startScale: 1, startRotation: 0,
        startDistance: 0, startAngle: 0,
        gestureType: null // 'drag' | 'pinch'
    })

    // Get distance between two pointers
    const getDistance = (p1, p2) => {
        const dx = p2.clientX - p1.clientX
        const dy = p2.clientY - p1.clientY
        return Math.sqrt(dx * dx + dy * dy)
    }

    // Get angle between two pointers (radians)
    const getAngle = (p1, p2) => {
        return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX)
    }

    // Get center point between two pointers
    const getCenter = (p1, p2) => ({
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2
    })

    const handlePointerDown = (e) => {
        e.stopPropagation()
        e.preventDefault()

        // Select this layer
        onSelect(layer.id)

        // Track this pointer
        pointersRef.current.set(e.pointerId, {
            clientX: e.clientX,
            clientY: e.clientY
        })

        // Capture pointer for reliable tracking outside element bounds
        elementRef.current?.setPointerCapture(e.pointerId)

        const pointers = Array.from(pointersRef.current.values())
        const gesture = gestureRef.current

        if (pointers.length === 1) {
            // Single pointer: prepare for drag
            gesture.gestureType = 'drag'
            gesture.startX = e.clientX
            gesture.startY = e.clientY
            gesture.startLayerX = layer.x
            gesture.startLayerY = layer.y
        } else if (pointers.length === 2) {
            // Two pointers: switch to pinch/rotate
            gesture.gestureType = 'pinch'
            gesture.startDistance = getDistance(pointers[0], pointers[1])
            gesture.startAngle = getAngle(pointers[0], pointers[1])
            gesture.startScale = layer.scale
            gesture.startRotation = layer.rotation
        }
    }

    const handlePointerMove = (e) => {
        if (!pointersRef.current.has(e.pointerId)) return

        // Update pointer position
        pointersRef.current.set(e.pointerId, {
            clientX: e.clientX,
            clientY: e.clientY
        })

        const pointers = Array.from(pointersRef.current.values())
        const gesture = gestureRef.current
        const container = containerRef.current
        if (!container) return

        const rect = container.getBoundingClientRect()

        if (gesture.gestureType === 'drag' && pointers.length === 1) {
            // Single finger drag: translate only
            const dx = e.clientX - gesture.startX
            const dy = e.clientY - gesture.startY

            // Convert to percentage of container
            const newX = gesture.startLayerX + (dx / rect.width) * 100
            const newY = gesture.startLayerY + (dy / rect.height) * 100

            // Clamp to container bounds (with padding)
            onUpdate(layer.id, {
                x: Math.max(5, Math.min(95, newX)),
                y: Math.max(5, Math.min(95, newY))
            })
        } else if (gesture.gestureType === 'pinch' && pointers.length === 2) {
            // Two finger pinch: scale + rotate simultaneously
            const currentDistance = getDistance(pointers[0], pointers[1])
            const currentAngle = getAngle(pointers[0], pointers[1])

            // Scale: ratio of current distance to start distance
            const scaleRatio = currentDistance / gesture.startDistance
            let newScale = gesture.startScale * scaleRatio
            newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

            // Rotation: delta from start angle
            const angleDelta = currentAngle - gesture.startAngle
            const newRotation = gesture.startRotation + angleDelta

            onUpdate(layer.id, {
                scale: newScale,
                rotation: newRotation
            })
        }
    }

    const handlePointerUp = (e) => {
        pointersRef.current.delete(e.pointerId)
        elementRef.current?.releasePointerCapture(e.pointerId)

        // Double-tap detection for editing
        const now = Date.now()
        const gesture = gestureRef.current
        const didDrag = Math.abs(e.clientX - gesture.startX) > 5 || Math.abs(e.clientY - gesture.startY) > 5

        if (!didDrag && pointersRef.current.size === 0) {
            if (now - lastTapRef.current < 300) {
                // Double tap detected - trigger edit
                onEdit(layer.id)
                lastTapRef.current = 0
            } else {
                lastTapRef.current = now
            }
        }

        // Reset gesture when all pointers released
        if (pointersRef.current.size === 0) {
            gestureRef.current.gestureType = null
        } else if (pointersRef.current.size === 1) {
            // Dropped to single pointer: switch back to drag mode
            const remaining = Array.from(pointersRef.current.values())[0]
            gesture.gestureType = 'drag'
            gesture.startX = remaining.clientX
            gesture.startY = remaining.clientY
            gesture.startLayerX = layer.x
            gesture.startLayerY = layer.y
        }
    }

    // Build transform string - ORDER MATTERS: translate → rotate → scale
    const transform = `translate(-50%, -50%) rotate(${layer.rotation}rad) scale(${layer.scale})`

    return (
        <div
            ref={elementRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute select-none touch-none cursor-move ${isSelected ? 'z-30' : 'z-20'
                }`}
            style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform,
                // GPU acceleration
                willChange: 'transform',
                // Prevent text selection during drag
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            <div
                className={`px-4 py-2 rounded-lg ${isSelected
                    ? 'bg-black/40 ring-2 ring-white ring-offset-2 ring-offset-transparent'
                    : 'bg-black/20'
                    } backdrop-blur-sm`}
            >
                <p
                    className="text-white text-xl md:text-2xl font-bold text-center whitespace-pre-wrap"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                >
                    {layer.text || 'Tap to edit'}
                </p>
            </div>

            {/* Delete button - visible when selected */}
            {isSelected && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }}
                    className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                    <X className="w-4 h-4 text-white" />
                </button>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CreateStory({ isOpen, onClose }) {
    const { user } = useAuthStore()
    const { addStory, fetchStories } = useStoryStore()

    // UI State
    const [step, setStep] = useState('select')
    const [mode, setMode] = useState(null)
    const [imageUrl, setImageUrl] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [selectedBg, setSelectedBg] = useState(0)
    const [isPosting, setIsPosting] = useState(false)
    const [error, setError] = useState(null)

    // Text layers state: array of { id, text, x, y, scale, rotation }
    const [textLayers, setTextLayers] = useState([])
    const [selectedLayerId, setSelectedLayerId] = useState(null)
    const [editingLayerId, setEditingLayerId] = useState(null)
    const [editText, setEditText] = useState('')

    const fileInputRef = useRef(null)
    const containerRef = useRef(null)
    const editInputRef = useRef(null)

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('select')
            setMode(null)
            setImageUrl(null)
            setImageFile(null)
            setSelectedBg(0)
            setError(null)
            setTextLayers([])
            setSelectedLayerId(null)
            setEditingLayerId(null)
        }
    }, [isOpen])

    // Focus edit input when editing
    useEffect(() => {
        if (editingLayerId && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [editingLayerId])

    // ─────────────────────────────────────────────────────────────────────────
    // TEXT LAYER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    const addTextLayer = useCallback(() => {
        const newLayer = {
            id: Date.now(),
            text: 'Double tap to edit',
            x: 50, // center
            y: 50,
            scale: 1,
            rotation: 0
        }
        setTextLayers(prev => [...prev, newLayer])
        setSelectedLayerId(newLayer.id)
    }, [])

    const updateTextLayer = useCallback((id, updates) => {
        setTextLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, ...updates } : layer
        ))
    }, [])

    const deleteTextLayer = useCallback((id) => {
        setTextLayers(prev => prev.filter(layer => layer.id !== id))
        if (selectedLayerId === id) setSelectedLayerId(null)
    }, [selectedLayerId])

    const handleLayerSelect = useCallback((id) => {
        setSelectedLayerId(id)
    }, [])

    // Double-tap to edit text
    const handleLayerEdit = useCallback((id) => {
        const layer = textLayers.find(l => l.id === id)
        if (layer) {
            setEditingLayerId(id)
            setEditText(layer.text)
        }
    }, [textLayers])

    const handleEditConfirm = useCallback(() => {
        if (editingLayerId) {
            updateTextLayer(editingLayerId, { text: editText || 'Text' })
            setEditingLayerId(null)
            setEditText('')
        }
    }, [editingLayerId, editText, updateTextLayer])

    // Deselect on background tap
    const handleBackgroundClick = useCallback(() => {
        setSelectedLayerId(null)
        if (editingLayerId) handleEditConfirm()
    }, [editingLayerId, handleEditConfirm])

    // ─────────────────────────────────────────────────────────────────────────
    // FILE & NAVIGATION HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

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
        // Add initial text layer
        addTextLayer()
    }

    const handleBack = () => {
        if (step === 'edit') {
            setStep('select')
            setMode(null)
            setImageUrl(null)
            setImageFile(null)
            setTextLayers([])
        } else {
            onClose()
        }
    }

    const handlePost = async () => {
        if (mode === 'image' && !imageFile) return
        if (mode === 'text' && textLayers.length === 0) return

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

            // For text stories, combine all layer texts
            const combinedText = textLayers.map(l => l.text).join('\n')

            const storyData = {
                content: mode === 'text' ? combinedText : null,
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

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm z-40">
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
                        disabled={isPosting || (mode === 'text' && textLayers.length === 0)}
                        className="px-4 py-2 bg-white text-black font-semibold rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
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
                            onClick={handleBackgroundClick}
                            className="relative rounded-2xl overflow-hidden shadow-2xl w-full max-w-[360px] mx-auto touch-none"
                            style={{
                                aspectRatio: '9/16',
                                maxHeight: 'calc(100vh - 160px)'
                            }}
                        >
                            {/* Background: Image or Gradient */}
                            {mode === 'image' && imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Story preview"
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                            ) : (
                                <div
                                    className="w-full h-full"
                                    style={{ background: BACKGROUND_GRADIENTS[selectedBg].gradient }}
                                />
                            )}

                            {/* Text Layers */}
                            {textLayers.map(layer => (
                                <TextLayer
                                    key={layer.id}
                                    layer={layer}
                                    isSelected={selectedLayerId === layer.id}
                                    onSelect={handleLayerSelect}
                                    onUpdate={updateTextLayer}
                                    onDelete={deleteTextLayer}
                                    onEdit={handleLayerEdit}
                                    containerRef={containerRef}
                                />
                            ))}

                            {/* User Avatar Overlay */}
                            <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
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
                            <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/30 rounded-full pointer-events-none" />
                        </div>

                        {/* Floating Controls */}
                        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4">
                            {/* Add Text Button */}
                            {mode === 'text' && (
                                <button
                                    onClick={addTextLayer}
                                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Text
                                </button>
                            )}

                            {/* Background Selector */}
                            {mode === 'text' && (
                                <div className="flex justify-center gap-2 overflow-x-auto pb-2">
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
                                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Change Photo
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Text Edit Modal */}
            {editingLayerId && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-4 w-full max-w-sm">
                        <input
                            ref={editInputRef}
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEditConfirm()}
                            placeholder="Enter text..."
                            className="w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => { setEditingLayerId(null); setEditText('') }}
                                className="flex-1 py-2 border rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditConfirm}
                                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-20 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-xl text-center text-sm z-50">
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
