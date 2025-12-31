import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Type, Loader2, ChevronLeft, Camera, Sparkles, Plus, Trash2 } from 'lucide-react'
import Moveable from 'react-moveable'
import html2canvas from 'html2canvas'
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

    // Text layers state
    const [textLayers, setTextLayers] = useState([])
    const [selectedLayerId, setSelectedLayerId] = useState(null)
    const [editingLayerId, setEditingLayerId] = useState(null)
    const [editText, setEditText] = useState('')

    const fileInputRef = useRef(null)
    const containerRef = useRef(null) // capture target
    const editInputRef = useRef(null)
    const moveableRef = useRef(null)

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

    // Focus edit input
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
            text: 'Tap to edit',
            translate: [0, 0],
            rotate: 0,
            scale: [1, 1],
            color: '#ffffff',
            fontSize: 24,
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

    const handleEditConfirm = useCallback(() => {
        if (editingLayerId) {
            updateTextLayer(editingLayerId, { text: editText || 'Text' })
            setEditingLayerId(null)
            setEditText('')
            // Reselect the layer after editing
            setSelectedLayerId(editingLayerId)
        }
    }, [editingLayerId, editText, updateTextLayer])

    const getTarget = () => {
        return document.getElementById(`layer-${selectedLayerId}`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FILE & NAVIGATION
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
        // Add initial text
        setTimeout(addTextLayer, 100)
    }

    const handleTextMode = () => {
        setMode('text')
        setStep('edit')
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

    // ─────────────────────────────────────────────────────────────────────────
    // POST LOGIC (CONVERT TO IMAGE -> UPLOAD)
    // ─────────────────────────────────────────────────────────────────────────

    const handlePost = async () => {
        if (isPosting) return

        // 1. Deselect everything to hide handles
        setSelectedLayerId(null)
        setIsPosting(true)
        setError(null)

        try {
            // Wait for UI to update (hide handles)
            await new Promise(resolve => setTimeout(resolve, 100))

            const element = containerRef.current
            if (!element) throw new Error("Capture area not found")

            // 2. Capture the composed story as an image
            const canvas = await html2canvas(element, {
                useCORS: true, // Allow loading cross-origin images (like avatars)
                scale: 2, // High res
                backgroundColor: null, // Transparent if needed
                logging: false
            })

            // 3. Convert canvas to Blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))

            // 4. Create File object
            const file = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' })

            // 5. Upload Image
            const formData = new FormData()
            formData.append('file', file)

            const uploadResponse = await api.post('/stories/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            // 6. Create Story (always image type now, since we flattened it)
            const storyData = {
                content: null, // Content burnt into image
                image_url: uploadResponse.data.image_url
            }

            const response = await api.post('/stories', storyData)
            addStory(response.data, user)
            await fetchStories()
            onClose()

        } catch (err) {
            console.error(err)
            setError(err.response?.data?.detail || 'Failed to create story')
        } finally {
            setIsPosting(false)
        }
    }

    if (!isOpen) return null

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
                    {step === 'select' ? 'Create Story' : 'Edit Story'}
                </h2>

                {step === 'edit' ? (
                    <button
                        onClick={handlePost}
                        disabled={isPosting}
                        className="px-4 py-2 bg-white text-black font-semibold rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
                    </button>
                ) : (
                    <div className="w-16" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#1a1a1a]">
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
                    </div>
                )}

                {/* Edit Mode */}
                {step === 'edit' && (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {/* Story Capture Container */}
                        <div
                            ref={containerRef}
                            onClick={() => setSelectedLayerId(null)}
                            className="relative rounded-xl overflow-hidden shadow-2xl w-full max-w-[360px] mx-auto bg-black"
                            style={{
                                aspectRatio: '9/16',
                                maxHeight: 'calc(100vh - 160px)',
                            }}
                        >
                            {/* Background: Image or Gradient */}
                            {mode === 'image' && imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Story preview"
                                    className="w-full h-full object-cover pointer-events-none select-none"
                                />
                            ) : (
                                <div
                                    className="w-full h-full"
                                    style={{ background: BACKGROUND_GRADIENTS[selectedBg].gradient }}
                                />
                            )}

                            {/* Text Layers */}
                            {textLayers.map(layer => (
                                <div
                                    key={layer.id}
                                    id={`layer-${layer.id}`}
                                    className="absolute top-1/2 left-1/2 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg"
                                    style={{
                                        transform: `translate(${layer.translate[0]}px, ${layer.translate[1]}px) rotate(${layer.rotate}deg) scale(${layer.scale[0]}, ${layer.scale[1]})`,
                                        width: 'max-content',
                                        maxWidth: '280px',
                                        cursor: 'pointer',
                                        zIndex: 10 // ensure text is above bg
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedLayerId(layer.id)
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        setEditingLayerId(layer.id)
                                        setEditText(layer.text)
                                    }}
                                    onTouchEnd={(e) => {
                                        // Simple double tap detection logic could go here
                                        // For now relying on button or double click
                                        e.stopPropagation();
                                        setSelectedLayerId(layer.id);
                                    }}
                                >
                                    <p className="text-white font-bold text-center whitespace-pre-wrap select-none" style={{ fontSize: `${layer.fontSize}px`, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                        {layer.text}
                                    </p>
                                </div>
                            ))}

                            {/* Moveable Controller */}
                            {selectedLayerId && (
                                <Moveable
                                    target={getTarget()}
                                    container={containerRef.current}
                                    ref={moveableRef}
                                    draggable={true}
                                    throttleDrag={0}
                                    resizable={true}
                                    throttleResize={0}
                                    rotatable={true}
                                    throttleRotate={0}
                                    origin={false}
                                    padding={{ left: 10, top: 10, right: 10, bottom: 10 }}

                                    // Drag
                                    onDragStart={e => e.set(textLayers.find(l => l.id === selectedLayerId).translate)}
                                    onDrag={e => {
                                        e.target.style.transform = e.transform
                                        updateTextLayer(selectedLayerId, { translate: e.beforeTranslate })
                                    }}

                                    // Resize
                                    onResizeStart={e => {
                                        e.setOrigin(["%", "%"])
                                        e.dragStart && e.dragStart.set(textLayers.find(l => l.id === selectedLayerId).translate)
                                    }}
                                    onResize={e => {
                                        e.target.style.width = `${e.width}px`
                                        e.target.style.height = `${e.height}px`
                                        e.target.style.transform = e.drag.transform
                                        updateTextLayer(selectedLayerId, { translate: e.drag.beforeTranslate })
                                    }}

                                    // Rotate
                                    onRotateStart={e => e.set(textLayers.find(l => l.id === selectedLayerId).rotate)}
                                    onRotate={e => {
                                        e.target.style.transform = e.drag.transform
                                        updateTextLayer(selectedLayerId, { rotate: e.beforeRotate })
                                    }}
                                />
                            )}

                            {/* Delete Button for Selected Layer */}
                            {selectedLayerId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteTextLayer(selectedLayerId)
                                    }}
                                    className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 p-2 rounded-full shadow-lg z-50 animate-in fade-in zoom-in duration-200"
                                >
                                    <Trash2 className="w-5 h-5 text-white" />
                                </button>
                            )}
                        </div>

                        {/* Floating Controls */}
                        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4 pointer-events-none">
                            <div className="pointer-events-auto flex gap-3">
                                {/* Add Text Button */}
                                <button
                                    onClick={addTextLayer}
                                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Text
                                </button>

                                {/* Change Image Button */}
                                {mode === 'image' && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Replace
                                    </button>
                                )}
                            </div>

                            {/* Background Selector */}
                            {mode === 'text' && (
                                <div className="flex justify-center gap-2 overflow-x-auto pb-2 pointer-events-auto w-full max-w-sm">
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
                        </div>
                    </div>
                )}
            </div>

            {/* Text Edit Modal */}
            {editingLayerId && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2">Edit Text</h3>
                        <input
                            ref={editInputRef}
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEditConfirm()}
                            className="w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setEditingLayerId(null); setEditText('') }}
                                className="flex-1 py-2 border rounded-lg font-medium hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditConfirm}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-20 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-xl text-center text-sm z-[70]">
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
