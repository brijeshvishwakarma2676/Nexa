import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Type, Loader2, ChevronLeft, Camera, Sparkles, Plus, Trash2, Palette } from 'lucide-react'
import Moveable from 'react-moveable'
import { toPng } from 'html-to-image'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BACKGROUND_GRADIENTS = [
    { id: 1, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', name: 'Purple' },
    { id: 2, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', name: 'Pink' },
    { id: 3, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', name: 'Blue' },
    { id: 4, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', name: 'Green' },
    { id: 5, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', name: 'Sunset' },
    { id: 6, gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', name: 'Pastel' },
    { id: 7, gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)', name: 'Orange' },
    { id: 8, gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', name: 'Dark' },
    { id: 9, gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', name: 'Night' },
    { id: 10, gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', name: 'Mint' },
]

const TEXT_COLORS = [
    '#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#FFE66D',
    '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
]

const FONT_STYLES = [
    { id: 'bold', name: 'Bold', style: { fontWeight: '800', fontFamily: 'system-ui, sans-serif' } },
    { id: 'classic', name: 'Classic', style: { fontWeight: '600', fontFamily: 'Georgia, serif' } },
    { id: 'modern', name: 'Modern', style: { fontWeight: '500', fontFamily: 'system-ui, sans-serif', letterSpacing: '2px' } },
    { id: 'typewriter', name: 'Typewriter', style: { fontWeight: '400', fontFamily: 'Courier, monospace' } },
    { id: 'neon', name: 'Neon', style: { fontWeight: '700', fontFamily: 'system-ui, sans-serif' } },
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
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showFontPicker, setShowFontPicker] = useState(false)

    // Text layers state
    const [textLayers, setTextLayers] = useState([])
    const [selectedLayerId, setSelectedLayerId] = useState(null)
    const [editingLayerId, setEditingLayerId] = useState(null)
    const [editText, setEditText] = useState('')

    const fileInputRef = useRef(null)
    const containerRef = useRef(null)
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
            setShowColorPicker(false)
            setShowFontPicker(false)
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
            text: '',
            translate: [0, 0],
            rotate: 0,
            scale: [1, 1],
            color: '#FFFFFF',
            fontStyleId: 'bold',
            fontSize: 28,
        }
        setTextLayers(prev => [...prev, newLayer])
        setSelectedLayerId(newLayer.id)
        // Auto open edit modal for new text
        setEditingLayerId(newLayer.id)
        setEditText('')
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
            if (editText.trim()) {
                updateTextLayer(editingLayerId, { text: editText })
            } else {
                // Delete empty text layers
                deleteTextLayer(editingLayerId)
            }
            setEditingLayerId(null)
            setEditText('')
        }
    }, [editingLayerId, editText, updateTextLayer, deleteTextLayer])

    const getTarget = () => document.getElementById(`layer-${selectedLayerId}`)

    const getSelectedLayer = () => textLayers.find(l => l.id === selectedLayerId)

    const getFontStyle = (fontStyleId) => {
        return FONT_STYLES.find(f => f.id === fontStyleId)?.style || FONT_STYLES[0].style
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
    }

    const handleTextMode = () => {
        setMode('text')
        setStep('edit')
        // Add initial text layer with edit modal open
        setTimeout(addTextLayer, 100)
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
    // POST LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    const handlePost = async () => {
        if (isPosting) return

        // Check if there's content
        const hasContent = mode === 'image' || textLayers.some(l => l.text.trim())
        if (!hasContent) {
            setError('Add some content to your story!')
            return
        }

        setSelectedLayerId(null)
        setIsPosting(true)
        setError(null)

        try {
            await new Promise(resolve => setTimeout(resolve, 150))

            const element = containerRef.current
            if (!element) throw new Error("Capture area not found")

            const dataUrl = await toPng(element, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#000000',
                skipFonts: true,
                filter: (node) => !node.classList?.contains('moveable-control-box')
            })

            const fetchResult = await fetch(dataUrl)
            const blob = await fetchResult.blob()
            const file = new File([blob], `story-${Date.now()}.png`, { type: 'image/png' })

            const formData = new FormData()
            formData.append('file', file)

            const uploadResponse = await api.post('/stories/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            const storyData = {
                content: null,
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

    const selectedLayer = getSelectedLayer()

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
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
                    </button>
                ) : (
                    <div className="w-16" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
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
                            onClick={() => { setSelectedLayerId(null); setShowColorPicker(false); setShowFontPicker(false); }}
                            className="relative rounded-xl overflow-hidden shadow-2xl w-full max-w-[360px] mx-auto"
                            style={{
                                aspectRatio: '9/16',
                                maxHeight: 'calc(100vh - 180px)',
                            }}
                        >
                            {/* Background */}
                            {mode === 'image' && imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Story preview"
                                    className="w-full h-full object-cover pointer-events-none select-none"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div
                                    className="w-full h-full"
                                    style={{ background: BACKGROUND_GRADIENTS[selectedBg].gradient }}
                                />
                            )}

                            {/* Text Layers - Instagram Style (no background box) */}
                            {textLayers.map(layer => {
                                if (!layer.text.trim()) return null
                                const fontStyle = getFontStyle(layer.fontStyleId)
                                const isNeon = layer.fontStyleId === 'neon'

                                return (
                                    <div
                                        key={layer.id}
                                        id={`layer-${layer.id}`}
                                        className="absolute top-1/2 left-1/2"
                                        style={{
                                            transform: `translate(${layer.translate[0]}px, ${layer.translate[1]}px) rotate(${layer.rotate}deg) scale(${layer.scale[0]}, ${layer.scale[1]})`,
                                            width: 'max-content',
                                            maxWidth: '90%',
                                            cursor: 'pointer',
                                            zIndex: selectedLayerId === layer.id ? 20 : 10,
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
                                    >
                                        <p
                                            className="text-center whitespace-pre-wrap select-none px-2"
                                            style={{
                                                color: layer.color,
                                                fontSize: `${layer.fontSize}px`,
                                                ...fontStyle,
                                                textShadow: isNeon
                                                    ? `0 0 10px ${layer.color}, 0 0 20px ${layer.color}, 0 0 30px ${layer.color}`
                                                    : '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                                                WebkitTextStroke: layer.color === '#000000' ? '1px rgba(255,255,255,0.3)' : 'none',
                                            }}
                                        >
                                            {layer.text}
                                        </p>
                                    </div>
                                )
                            })}

                            {/* Moveable Controller */}
                            {selectedLayerId && getTarget() && (
                                <Moveable
                                    target={getTarget()}
                                    container={containerRef.current}
                                    ref={moveableRef}
                                    draggable={true}
                                    throttleDrag={0}
                                    resizable={false}
                                    scalable={true}
                                    throttleScale={0}
                                    rotatable={true}
                                    throttleRotate={0}
                                    origin={false}

                                    onDragStart={e => {
                                        const layer = textLayers.find(l => l.id === selectedLayerId)
                                        if (layer) e.set(layer.translate)
                                    }}
                                    onDrag={e => {
                                        e.target.style.transform = e.transform
                                        updateTextLayer(selectedLayerId, { translate: e.beforeTranslate })
                                    }}

                                    onScaleStart={e => {
                                        const layer = textLayers.find(l => l.id === selectedLayerId)
                                        if (layer) e.set(layer.scale)
                                    }}
                                    onScale={e => {
                                        e.target.style.transform = e.drag.transform
                                        updateTextLayer(selectedLayerId, {
                                            scale: e.scale,
                                            translate: e.drag.beforeTranslate
                                        })
                                    }}

                                    onRotateStart={e => {
                                        const layer = textLayers.find(l => l.id === selectedLayerId)
                                        if (layer) e.set(layer.rotate)
                                    }}
                                    onRotate={e => {
                                        e.target.style.transform = e.drag.transform
                                        updateTextLayer(selectedLayerId, {
                                            rotate: e.beforeRotate,
                                            translate: e.drag.beforeTranslate
                                        })
                                    }}
                                />
                            )}
                        </div>

                        {/* Floating Controls */}
                        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4 pointer-events-none">
                            {/* Text Editing Controls */}
                            {selectedLayerId && selectedLayer && (
                                <div className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2">
                                    {/* Color Picker Toggle */}
                                    <button
                                        onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false); }}
                                        className="w-8 h-8 rounded-full border-2 border-white/50 hover:border-white transition-colors"
                                        style={{ backgroundColor: selectedLayer.color }}
                                    />

                                    {/* Font Style Toggle */}
                                    <button
                                        onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false); }}
                                        className="px-3 py-1 text-white text-sm font-medium bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                    >
                                        Aa
                                    </button>

                                    {/* Edit Text */}
                                    <button
                                        onClick={() => { setEditingLayerId(selectedLayerId); setEditText(selectedLayer.text); }}
                                        className="px-3 py-1 text-white text-sm bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                    >
                                        Edit
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => deleteTextLayer(selectedLayerId)}
                                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Color Picker */}
                            {showColorPicker && selectedLayerId && (
                                <div className="pointer-events-auto flex gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2">
                                    {TEXT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => updateTextLayer(selectedLayerId, { color })}
                                            className={`w-7 h-7 rounded-full border-2 transition-transform ${selectedLayer?.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Font Picker */}
                            {showFontPicker && selectedLayerId && (
                                <div className="pointer-events-auto flex gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2 overflow-x-auto">
                                    {FONT_STYLES.map(font => (
                                        <button
                                            key={font.id}
                                            onClick={() => updateTextLayer(selectedLayerId, { fontStyleId: font.id })}
                                            className={`px-3 py-1 text-white text-sm rounded-full whitespace-nowrap transition-all ${selectedLayer?.fontStyleId === font.id
                                                    ? 'bg-white/40'
                                                    : 'bg-white/10 hover:bg-white/20'
                                                }`}
                                            style={font.style}
                                        >
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Main Action Buttons */}
                            <div className="pointer-events-auto flex gap-3">
                                <button
                                    onClick={addTextLayer}
                                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Text
                                </button>

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
                                            title={bg.name}
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
                <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-sm border border-zinc-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-3">Add Text</h3>
                        <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Type something..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none placeholder:text-zinc-500"
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => { setEditingLayerId(null); setEditText(''); deleteTextLayer(editingLayerId); }}
                                className="flex-1 py-2.5 border border-zinc-600 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditConfirm}
                                disabled={!editText.trim()}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-24 left-4 right-4 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-center text-sm z-70 animate-in fade-in slide-in-from-bottom-2">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
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
