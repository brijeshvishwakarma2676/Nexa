import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Type, Loader2, ChevronLeft, Image as ImageIcon, Sparkles, Plus, Trash2, Crop } from 'lucide-react'
import Moveable from 'react-moveable'
import { toPng } from 'html-to-image'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
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
    { id: 9, gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    { id: 10, gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
]

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA']

const FONT_STYLES = [
    { id: 'bold', name: 'Bold', style: { fontWeight: '800', fontFamily: 'system-ui, sans-serif' } },
    { id: 'classic', name: 'Classic', style: { fontWeight: '600', fontFamily: 'Georgia, serif' } },
    { id: 'modern', name: 'Modern', style: { fontWeight: '500', fontFamily: 'system-ui, sans-serif', letterSpacing: '2px' } },
    { id: 'neon', name: 'Neon', style: { fontWeight: '700', fontFamily: 'system-ui, sans-serif' } },
]

export default function CreateStory({ isOpen, onClose }) {
    const { user } = useAuthStore()
    const { addStory, fetchStories } = useStoryStore()

    // Background state
    const [bgType, setBgType] = useState('gradient') // 'gradient' | 'image'
    const [bgGradientIndex, setBgGradientIndex] = useState(0)
    const [bgImageUrl, setBgImageUrl] = useState(null)

    // Layers - both text and images
    const [layers, setLayers] = useState([])
    const [selectedLayerId, setSelectedLayerId] = useState(null)

    // Text editing
    const [editingLayerId, setEditingLayerId] = useState(null)
    const [editText, setEditText] = useState('')

    // UI state
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showFontPicker, setShowFontPicker] = useState(false)
    const [isPosting, setIsPosting] = useState(false)
    const [error, setError] = useState(null)

    const containerRef = useRef(null)
    const bgFileInputRef = useRef(null)
    const layerFileInputRef = useRef(null)
    const editInputRef = useRef(null)
    const cropImageRef = useRef(null)

    // Crop state
    const [croppingLayerId, setCroppingLayerId] = useState(null)
    const [crop, setCrop] = useState(null)
    const [completedCrop, setCompletedCrop] = useState(null)

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setBgType('gradient')
            setBgGradientIndex(0)
            setBgImageUrl(null)
            setLayers([])
            setSelectedLayerId(null)
            setEditingLayerId(null)
            setShowColorPicker(false)
            setShowFontPicker(false)
            setError(null)
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
    // LAYER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    const addTextLayer = useCallback(() => {
        const newLayer = {
            id: Date.now(),
            type: 'text',
            text: '',
            translate: [0, 0],
            rotate: 0,
            scale: [1, 1],
            color: '#FFFFFF',
            fontStyleId: 'bold',
            fontSize: 28,
        }
        setLayers(prev => [...prev, newLayer])
        setSelectedLayerId(newLayer.id)
        setEditingLayerId(newLayer.id)
        setEditText('')
    }, [])

    const addImageLayer = useCallback((dataUrl) => {
        // Load image to get actual dimensions
        const img = new Image()
        img.onload = () => {
            // Calculate size to fit nicely in canvas (max 200px on largest side)
            const maxSize = 200
            let width = img.width
            let height = img.height

            if (width > height) {
                if (width > maxSize) {
                    height = (height / width) * maxSize
                    width = maxSize
                }
            } else {
                if (height > maxSize) {
                    width = (width / height) * maxSize
                    height = maxSize
                }
            }

            const newLayer = {
                id: Date.now(),
                type: 'image',
                imageUrl: dataUrl,
                translate: [0, 0],
                rotate: 0,
                scale: [1, 1],
                width: Math.round(width),
                height: Math.round(height),
                originalWidth: img.width,
                originalHeight: img.height,
            }
            setLayers(prev => [...prev, newLayer])
            setSelectedLayerId(newLayer.id)
        }
        img.src = dataUrl
    }, [])

    const updateLayer = useCallback((id, updates) => {
        setLayers(prev => prev.map(layer =>
            layer.id === id ? { ...layer, ...updates } : layer
        ))
    }, [])

    const deleteLayer = useCallback((id) => {
        setLayers(prev => prev.filter(layer => layer.id !== id))
        if (selectedLayerId === id) setSelectedLayerId(null)
    }, [selectedLayerId])

    const handleEditConfirm = useCallback(() => {
        if (editingLayerId) {
            if (editText.trim()) {
                updateLayer(editingLayerId, { text: editText })
                setSelectedLayerId(editingLayerId)
            } else {
                deleteLayer(editingLayerId)
            }
            setEditingLayerId(null)
            setEditText('')
        }
    }, [editingLayerId, editText, updateLayer, deleteLayer])

    // Apply crop to image layer
    const applyCrop = useCallback(() => {
        if (!croppingLayerId || !completedCrop || !cropImageRef.current) return

        const image = cropImageRef.current
        const canvas = document.createElement('canvas')
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        canvas.width = completedCrop.width * scaleX
        canvas.height = completedCrop.height * scaleY

        const ctx = canvas.getContext('2d')
        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        )

        const croppedUrl = canvas.toDataURL('image/png')
        updateLayer(croppingLayerId, {
            imageUrl: croppedUrl,
            width: Math.min(completedCrop.width, 200),
            height: Math.min(completedCrop.height, 200),
        })

        setCroppingLayerId(null)
        setCrop(null)
        setCompletedCrop(null)
    }, [croppingLayerId, completedCrop, updateLayer])

    const getTarget = () => document.getElementById(`layer-${selectedLayerId}`)
    const getSelectedLayer = () => layers.find(l => l.id === selectedLayerId)
    const getFontStyle = (fontStyleId) => FONT_STYLES.find(f => f.id === fontStyleId)?.style || FONT_STYLES[0].style

    // ─────────────────────────────────────────────────────────────────────────
    // FILE HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    const handleBgImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = (event) => {
            setBgType('image')
            setBgImageUrl(event.target.result)
        }
        reader.readAsDataURL(file)
        e.target.value = '' // Reset for re-selection
    }

    const handleLayerImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = (event) => {
            addImageLayer(event.target.result)
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    const handlePost = async () => {
        if (isPosting) return

        // Need at least background or content
        const hasContent = bgType === 'image' || layers.some(l => l.type === 'image' || (l.type === 'text' && l.text.trim()))
        if (!hasContent) {
            setError('Add some content to your story!')
            return
        }

        setSelectedLayerId(null)
        setShowColorPicker(false)
        setShowFontPicker(false)
        setIsPosting(true)
        setError(null)

        try {
            await new Promise(resolve => setTimeout(resolve, 200))

            const element = containerRef.current
            if (!element) throw new Error("Capture area not found")

            const dataUrl = await toPng(element, {
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

            const storyData = { content: null, image_url: uploadResponse.data.image_url }
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
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <X className="w-6 h-6 text-white" />
                </button>

                <h2 className="text-white font-semibold text-lg">Create Story</h2>

                <button
                    onClick={handlePost}
                    disabled={isPosting}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
                </button>
            </div>

            {/* Editor */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0a] p-4">
                {/* Story Canvas */}
                <div
                    ref={containerRef}
                    onClick={() => { setSelectedLayerId(null); setShowColorPicker(false); setShowFontPicker(false); }}
                    className="relative rounded-xl overflow-hidden shadow-2xl w-full max-w-[360px] mx-auto"
                    style={{ aspectRatio: '9/16', maxHeight: 'calc(100vh - 200px)' }}
                >
                    {/* Background */}
                    {bgType === 'image' && bgImageUrl ? (
                        <img src={bgImageUrl} alt="Background" className="w-full h-full object-cover pointer-events-none select-none" />
                    ) : (
                        <div className="w-full h-full" style={{ background: BACKGROUND_GRADIENTS[bgGradientIndex].gradient }} />
                    )}

                    {/* Layers */}
                    {layers.map(layer => {
                        if (layer.type === 'text') {
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
                                        cursor: 'move',
                                        zIndex: selectedLayerId === layer.id ? 20 : 10,
                                    }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingLayerId(layer.id); setEditText(layer.text); }}
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
                                        }}
                                    >
                                        {layer.text}
                                    </p>
                                </div>
                            )
                        }

                        if (layer.type === 'image') {
                            return (
                                <div
                                    key={layer.id}
                                    id={`layer-${layer.id}`}
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        transform: `translate(${layer.translate[0]}px, ${layer.translate[1]}px) rotate(${layer.rotate}deg) scale(${layer.scale[0]}, ${layer.scale[1]})`,
                                        width: `${layer.width}px`,
                                        height: `${layer.height}px`,
                                        cursor: 'move',
                                        zIndex: selectedLayerId === layer.id ? 20 : 10,
                                    }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                                >
                                    <img
                                        src={layer.imageUrl}
                                        alt="Layer"
                                        className="w-full h-full object-contain rounded-lg shadow-lg select-none pointer-events-none"
                                        draggable={false}
                                    />
                                </div>
                            )
                        }
                        return null
                    })}

                    {/* Moveable */}
                    {selectedLayerId && getTarget() && !editingLayerId && !croppingLayerId && (
                        <Moveable
                            target={getTarget()}
                            container={containerRef.current}
                            draggable={true}
                            throttleDrag={0}
                            resizable={selectedLayer?.type === 'image'}
                            scalable={selectedLayer?.type === 'text'}
                            rotatable={true}
                            origin={false}
                            keepRatio={selectedLayer?.type === 'image'}

                            onDragStart={e => {
                                const layer = layers.find(l => l.id === selectedLayerId)
                                if (layer) e.set(layer.translate)
                            }}
                            onDrag={e => {
                                e.target.style.transform = e.transform
                                updateLayer(selectedLayerId, { translate: e.beforeTranslate })
                            }}

                            onResizeStart={e => {
                                e.setOrigin(["%", "%"])
                                e.dragStart && e.dragStart.set(layers.find(l => l.id === selectedLayerId)?.translate || [0, 0])
                            }}
                            onResize={e => {
                                e.target.style.width = `${e.width}px`
                                e.target.style.height = `${e.height}px`
                                e.target.style.transform = e.drag.transform
                                updateLayer(selectedLayerId, {
                                    width: e.width,
                                    height: e.height,
                                    translate: e.drag.beforeTranslate
                                })
                            }}

                            onScaleStart={e => {
                                const layer = layers.find(l => l.id === selectedLayerId)
                                if (layer) e.set(layer.scale)
                            }}
                            onScale={e => {
                                e.target.style.transform = e.drag.transform
                                updateLayer(selectedLayerId, { scale: e.scale, translate: e.drag.beforeTranslate })
                            }}

                            onRotateStart={e => {
                                const layer = layers.find(l => l.id === selectedLayerId)
                                if (layer) e.set(layer.rotate)
                            }}
                            onRotate={e => {
                                e.target.style.transform = e.drag.transform
                                updateLayer(selectedLayerId, { rotate: e.beforeRotate, translate: e.drag.beforeTranslate })
                            }}
                        />
                    )}
                </div>

                {/* Floating Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4 pointer-events-none">
                    {/* Layer Controls */}
                    {selectedLayerId && selectedLayer && (
                        <div className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2">
                            {selectedLayer.type === 'text' && (
                                <>
                                    <button
                                        onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false); }}
                                        className="w-8 h-8 rounded-full border-2 border-white/50"
                                        style={{ backgroundColor: selectedLayer.color }}
                                    />
                                    <button
                                        onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false); }}
                                        className="px-3 py-1 text-white text-sm bg-white/20 rounded-full"
                                    >
                                        Aa
                                    </button>
                                    <button
                                        onClick={() => { setEditingLayerId(selectedLayerId); setEditText(selectedLayer.text); }}
                                        className="px-3 py-1 text-white text-sm bg-white/20 rounded-full"
                                    >
                                        Edit
                                    </button>
                                </>
                            )}
                            {selectedLayer.type === 'image' && (
                                <button
                                    onClick={() => { setCroppingLayerId(selectedLayerId); setCrop(undefined); }}
                                    className="px-3 py-1 text-white text-sm bg-white/20 rounded-full flex items-center gap-1"
                                >
                                    <Crop className="w-4 h-4" />
                                    Crop
                                </button>
                            )}
                            <button
                                onClick={() => deleteLayer(selectedLayerId)}
                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-full"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Color Picker */}
                    {showColorPicker && selectedLayerId && selectedLayer?.type === 'text' && (
                        <div className="pointer-events-auto flex gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2">
                            {TEXT_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => updateLayer(selectedLayerId, { color })}
                                    className={`w-7 h-7 rounded-full border-2 ${selectedLayer?.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Font Picker */}
                    {showFontPicker && selectedLayerId && selectedLayer?.type === 'text' && (
                        <div className="pointer-events-auto flex gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-2">
                            {FONT_STYLES.map(font => (
                                <button
                                    key={font.id}
                                    onClick={() => updateLayer(selectedLayerId, { fontStyleId: font.id })}
                                    className={`px-3 py-1 text-white text-sm rounded-full ${selectedLayer?.fontStyleId === font.id ? 'bg-white/40' : 'bg-white/10'}`}
                                    style={font.style}
                                >
                                    {font.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Add Buttons */}
                    <div className="pointer-events-auto flex gap-3">
                        <button
                            onClick={addTextLayer}
                            className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm flex items-center gap-2 hover:bg-white/30"
                        >
                            <Type className="w-4 h-4" />
                            Add Text
                        </button>
                        <button
                            onClick={() => layerFileInputRef.current?.click()}
                            className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm flex items-center gap-2 hover:bg-white/30"
                        >
                            <ImageIcon className="w-4 h-4" />
                            Add Image
                        </button>
                    </div>

                    {/* Background Selector */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 pointer-events-auto w-full max-w-sm justify-center">
                        {/* Background image option */}
                        <button
                            onClick={() => bgFileInputRef.current?.click()}
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 transition-colors ${bgType === 'image' ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                        >
                            <ImageIcon className="w-5 h-5 text-white" />
                        </button>

                        {/* Gradients */}
                        {BACKGROUND_GRADIENTS.map((bg, index) => (
                            <button
                                key={bg.id}
                                onClick={() => { setBgType('gradient'); setBgGradientIndex(index); }}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0 transition-transform ${bgType === 'gradient' && bgGradientIndex === index ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-105'
                                    }`}
                                style={{ background: bg.gradient }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Text Edit Modal */}
            {editingLayerId && (
                <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4" onClick={() => { handleEditConfirm(); }}>
                    <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-sm border border-zinc-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-3">Add Text</h3>
                        <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Type something..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => { setEditingLayerId(null); setEditText(''); deleteLayer(editingLayerId); }}
                                className="flex-1 py-2.5 border border-zinc-600 text-white rounded-xl font-medium hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditConfirm}
                                disabled={!editText.trim()}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-24 left-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-xl text-center text-sm z-70">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
                </div>
            )}

            {/* Crop Modal */}
            {croppingLayerId && (
                <div className="fixed inset-0 bg-black/95 z-60 flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg">
                        <h3 className="text-lg font-bold text-white mb-4 text-center">Crop Image</h3>
                        <div className="bg-zinc-900 rounded-xl p-4 max-h-[60vh] overflow-auto">
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                            >
                                <img
                                    ref={cropImageRef}
                                    src={layers.find(l => l.id === croppingLayerId)?.imageUrl}
                                    alt="Crop"
                                    className="max-w-full max-h-[50vh] mx-auto"
                                />
                            </ReactCrop>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setCroppingLayerId(null); setCrop(null); setCompletedCrop(null); }}
                                className="flex-1 py-2.5 border border-zinc-600 text-white rounded-xl font-medium hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyCrop}
                                disabled={!completedCrop}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
                            >
                                Apply Crop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file inputs */}
            <input ref={bgFileInputRef} type="file" accept="image/*" onChange={handleBgImageSelect} className="hidden" />
            <input ref={layerFileInputRef} type="file" accept="image/*" onChange={handleLayerImageSelect} className="hidden" />
        </div>
    )
}
