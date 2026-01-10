import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Type, Loader2, ChevronLeft, Image as ImageIcon, Sparkles, Plus, Trash2, Crop } from 'lucide-react'
import Moveable from 'react-moveable'
import { toJpeg } from 'html-to-image'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useStoryStore } from '../stores/storyStore'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1920

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
    const { addStory, fetchStories, isUploading, setUploading } = useStoryStore()

    // Background state
    const [bgType, setBgType] = useState('gradient') // 'gradient' | 'image'
    const [bgGradientIndex, setBgGradientIndex] = useState(0)
    const [bgImageUrl, setBgImageUrl] = useState(null)
    const [bgTransform, setBgTransform] = useState({
        translate: [0, 0],
        rotate: 0,
        scale: [1, 1],
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
    })

    // Layers - both text and images
    const [layers, setLayers] = useState([])
    const [selectedLayerId, setSelectedLayerId] = useState(null)

    // Text editing
    const [editingLayerId, setEditingLayerId] = useState(null)
    const [editText, setEditText] = useState('')

    // UI state
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showFontPicker, setShowFontPicker] = useState(false)
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
            setBgTransform({
                translate: [0, 0],
                rotate: 0,
                scale: [1, 1],
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT
            })
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

    // Handle Responsive Scaling
    const [displayScale, setDisplayScale] = useState(0.2)
    const previewWrapperRef = useRef(null)

    const updateScale = useCallback(() => {
        if (!previewWrapperRef.current) return
        const padding = 40
        const availableWidth = previewWrapperRef.current.offsetWidth - padding
        const availableHeight = previewWrapperRef.current.offsetHeight - padding
        
        const scaleW = availableWidth / CANVAS_WIDTH
        const scaleH = availableHeight / CANVAS_HEIGHT
        
        setDisplayScale(Math.min(scaleW, scaleH))
    }, [])

    useEffect(() => {
        updateScale()
        window.addEventListener('resize', updateScale)
        return () => window.removeEventListener('resize', updateScale)
    }, [updateScale, isOpen])

    // ─────────────────────────────────────────────────────────────────────────
    // LAYER MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    const addTextLayer = useCallback(() => {
        const newLayer = {
            id: Date.now(),
            type: 'text',
            text: '',
            translate: [0, (CANVAS_HEIGHT - 200) / 2], 
            rotate: 0,
            scale: [1, 1],
            color: '#FFFFFF',
            fontStyleId: 'bold',
            fontSize: 72, // Scaled for 1080p
            width: CANVAS_WIDTH, 
        }
        setLayers(prev => [...prev, newLayer])
        setSelectedLayerId(newLayer.id)
        setEditingLayerId(newLayer.id)
        setEditText('')
    }, [])

    const addImageLayer = useCallback((dataUrl) => {
        const img = new Image()
        img.onload = () => {
            const maxSize = 600 // Scaled for 1080p
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
                translate: [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2],
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
            width: completedCrop.width,
            height: completedCrop.height,
        })

        setCroppingLayerId(null)
        setCrop(null)
        setCompletedCrop(null)
    }, [croppingLayerId, completedCrop, updateLayer])

    const getTarget = () => {
        if (selectedLayerId === 'background') return document.getElementById('layer-background')
        return document.getElementById(`layer-${selectedLayerId}`)
    }
    const getSelectedLayer = () => {
        if (selectedLayerId === 'background') return { type: 'background' }
        return layers.find(l => l.id === selectedLayerId)
    }
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
            const img = new Image()
            img.onload = () => {
                // Smart Cover Logic:
                // Find scale that fills the 1080x1920 canvas while maintaining AR
                const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height)
                const width = img.width * scale
                const height = img.height * scale
                
                // Center it
                const tx = (CANVAS_WIDTH - width) / 2
                const ty = (CANVAS_HEIGHT - height) / 2

                setBgType('image')
                setBgImageUrl(event.target.result)
                setBgTransform({
                    translate: [tx, ty],
                    rotate: 0,
                    scale: [1, 1],
                    width: Math.round(width),
                    height: Math.round(height)
                })
                setSelectedLayerId('background')
            }
            img.src = event.target.result
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
        if (isUploading) return

        // Need at least background or content
        const hasContent = bgType === 'image' || layers.some(l => l.type === 'image' || (l.type === 'text' && l.text.trim()))
        if (!hasContent) {
            setError('Add some content to your story!')
            return
        }

        setSelectedLayerId(null)
        setShowColorPicker(false)
        setShowFontPicker(false)
        setUploading(true)
        setError(null)

        try {
            await new Promise(resolve => setTimeout(resolve, 200))

            const element = containerRef.current
            if (!element) throw new Error("Capture area not found")

            const dataUrl = await toJpeg(element, {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                quality: 0.85,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                },
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
            setUploading(false)
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
                    disabled={isUploading}
                    className="px-4 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
                </button>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#050505]">
                
                {/* Desktop Left Sidebar: Selection Tools */}
                <div className="hidden lg:flex flex-col w-72 bg-zinc-900/50 border-r border-white/5 p-6 gap-6 overflow-y-auto">
                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Canvas Layers</h3>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={addTextLayer}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-all">
                                    <Type className="w-5 h-5" />
                                </div>
                                <span className="text-white font-medium">Add Text</span>
                            </div>
                            <Plus className="w-4 h-4 text-zinc-500" />
                        </button>
                        <button
                            onClick={() => layerFileInputRef.current?.click()}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg group-hover:bg-pink-500 group-hover:text-white transition-all">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <span className="text-white font-medium">Add Photo</span>
                            </div>
                            <Plus className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Background</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <button
                                onClick={() => bgFileInputRef.current?.click()}
                                className={`aspect-square rounded-xl flex items-center justify-center bg-zinc-800 border-2 transition-all ${bgType === 'image' ? 'border-purple-500 bg-purple-500/10' : 'border-transparent hover:bg-zinc-700'}`}
                            >
                                <ImageIcon className="w-6 h-6 text-zinc-400" />
                            </button>
                            {BACKGROUND_GRADIENTS.map((bg, index) => (
                                <button
                                    key={bg.id}
                                    onClick={() => { setBgType('gradient'); setBgGradientIndex(index); }}
                                    className={`aspect-square rounded-xl transition-all ${bgType === 'gradient' && bgGradientIndex === index ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black scale-95' : 'hover:scale-105'}`}
                                    style={{ background: bg.gradient }}
                                />
                            ))}
                        </div>
                    </div>

                    {bgType === 'image' && (
                        <div className="mt-4 flex flex-col gap-2">
                             <button
                                onClick={() => setSelectedLayerId('background')}
                                className="w-full flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-2xl border border-purple-500/30 transition-all text-purple-400 font-medium group"
                            >
                                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                Adjust Background
                            </button>
                        </div>
                    )}
                </div>

                {/* Editor Surface */}
                <div ref={previewWrapperRef} className="flex-1 relative flex items-start justify-center p-4 lg:p-8 min-h-0 overflow-hidden" onClick={() => { setSelectedLayerId(null); setShowColorPicker(false); setShowFontPicker(false); }}>
                    {/* Story Canvas */}
                    <div
                        ref={containerRef}
                        className="relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] bg-black ring-4 ring-purple-500/40 ring-offset-4 ring-offset-black transition-all duration-300 mt-4 lg:mt-0"
                        style={{
                            width: CANVAS_WIDTH,
                            height: CANVAS_HEIGHT,
                            transform: `scale(${displayScale})`,
                            transformOrigin: 'top center',
                            flexShrink: 0
                        }}
                    >
                        {/* High-Visibility Edge Border */}
                        <div className="absolute inset-0 border-12 border-white/5 pointer-events-none z-60" />
                        <div className="absolute inset-0 border-2 border-purple-500/30 pointer-events-none z-60" />
                        
                        {/* Decorative Corner Accents - More Prominent */}
                        <div className="absolute top-0 left-0 w-32 h-32 border-t-10 border-l-10 border-purple-500 z-60 pointer-events-none rounded-tl-2xl shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                        <div className="absolute top-0 right-0 w-32 h-32 border-t-10 border-r-10 border-purple-500 z-60 pointer-events-none rounded-tr-2xl shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-10 border-l-10 border-purple-500 z-60 pointer-events-none rounded-bl-2xl shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-10 border-r-10 border-purple-500 z-60 pointer-events-none rounded-br-2xl shadow-[0_0_15px_rgba(168,85,247,0.5)]" />

                        {/* Background */}
                        {bgType === 'image' && bgImageUrl ? (
                            <div
                                id="layer-background"
                                className="absolute top-0 left-0"
                                style={{
                                    width: `${bgTransform.width}px`,
                                    height: `${bgTransform.height}px`,
                                    transform: `translate(${bgTransform.translate[0]}px, ${bgTransform.translate[1]}px) rotate(${bgTransform.rotate}deg) scale(${bgTransform.scale[0]}, ${bgTransform.scale[1]})`,
                                    transformOrigin: 'top left',
                                    zIndex: 0
                                }}
                                onClick={(e) => { e.stopPropagation(); setSelectedLayerId('background'); }}
                            >
                                <img src={bgImageUrl} alt="Background" className="w-full h-full object-cover pointer-events-none select-none" />
                            </div>
                        ) : (
                            <div className="w-full h-full" style={{ background: BACKGROUND_GRADIENTS[bgGradientIndex].gradient }} />
                        )}

                        {/* Safety Guides (Visual Only) */}
                        <div className="absolute top-0 left-0 right-0 h-40 bg-linear-to-b from-black/40 to-transparent pointer-events-none z-30 opacity-50" />
                        <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-black/40 to-transparent pointer-events-none z-30 opacity-50" />
                        <div className="absolute top-4 left-4 right-4 h-1 rounded-full bg-white/10 pointer-events-none z-30" />
                        <div className="absolute top-12 left-4 w-12 h-12 rounded-full bg-white/10 pointer-events-none z-30" />

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
                                        className="absolute top-0 left-0"
                                        style={{
                                            transform: `translate(${layer.translate[0]}px, ${layer.translate[1]}px) rotate(${layer.rotate}deg) scale(${layer.scale[0]}, ${layer.scale[1]})`,
                                            transformOrigin: 'top left',
                                            width: `${layer.width || CANVAS_WIDTH}px`,
                                            height: 'auto',
                                            textAlign: 'center',
                                            cursor: 'move',
                                            zIndex: selectedLayerId === layer.id ? 20 : 10,
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                                        onDoubleClick={(e) => { e.stopPropagation(); setEditingLayerId(layer.id); setEditText(layer.text); }}
                                    >
                                        <p
                                            className="whitespace-pre-wrap select-none px-4 w-full wrap-break-word"
                                            style={{
                                                color: layer.color,
                                                fontSize: `${layer.fontSize}px`,
                                                ...fontStyle,
                                                textShadow: isNeon
                                                    ? `0 0 10px ${layer.color}, 0 0 20px ${layer.color}, 0 0 30px ${layer.color}`
                                                    : '3px 3px 10px rgba(0,0,0,0.5)',
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
                                        className="absolute top-0 left-0"
                                        style={{
                                            transform: `translate(${layer.translate[0]}px, ${layer.translate[1]}px) rotate(${layer.rotate}deg) scale(${layer.scale[0]}, ${layer.scale[1]})`,
                                            transformOrigin: 'top left',
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
                                            className="w-full h-full object-contain rounded-lg shadow-xl select-none pointer-events-none"
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
                                key={selectedLayerId}
                                target={getTarget()}
                                container={containerRef.current}
                                draggable={true}
                                throttleDrag={0}
                                resizable={selectedLayer?.type === 'text' ? { directions: ['e', 'w'] } : (selectedLayerId === 'background' ? false : true)}
                                scalable={selectedLayer?.type === 'text' ? { directions: ['nw', 'ne', 'sw', 'se'] } : (selectedLayer?.type === 'image' || selectedLayerId === 'background' ? true : false)}
                                rotatable={true}
                                origin={['50%', '0%']}
                                keepRatio={selectedLayer?.type === 'image' || selectedLayerId === 'background'}
                                renderDirections={selectedLayer?.type === 'text' ? ['nw', 'ne', 'sw', 'se', 'e', 'w'] : ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
                                
                                // Coordinate Adjustment
                                zoom={1 / displayScale}
                                
                                // Snapping
                                snappable={true}
                                snapContainer={containerRef.current}
                                snapCenter={true}
                                snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
                                elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
                                horizontalGuidelines={[CANVAS_HEIGHT / 2]}
                                verticalGuidelines={[CANVAS_WIDTH / 2]}
                                snapThreshold={5 * (1/displayScale)}

                                onDragStart={e => {
                                    if (selectedLayerId === 'background') {
                                        e.set(bgTransform.translate)
                                    } else {
                                        const layer = layers.find(l => l.id === selectedLayerId)
                                        if (layer) e.set(layer.translate)
                                    }
                                }}
                                onDrag={e => {
                                    e.target.style.transform = e.transform
                                    if (selectedLayerId === 'background') {
                                        setBgTransform(prev => ({ ...prev, translate: e.beforeTranslate }))
                                    } else {
                                        updateLayer(selectedLayerId, { translate: e.beforeTranslate })
                                    }
                                }}

                                onResizeStart={e => {
                                    e.setOrigin(["0", "0"])
                                    // Override keepRatio for text resizing (width changes)
                                    if (selectedLayer?.type === 'text') {
                                        e.keepRatio = false
                                    }
                                    const layer = layers.find(l => l.id === selectedLayerId)
                                    if (layer) {
                                        e.dragStart && e.dragStart.set(layer.translate)
                                    } else if (selectedLayerId === 'background') {
                                        e.dragStart && e.dragStart.set(bgTransform.translate)
                                    }
                                }}
                                onResize={e => {
                                    e.target.style.width = `${e.width}px`
                                    e.target.style.height = `${e.height}px`
                                    e.target.style.transform = e.drag.transform
                                    
                                    if (selectedLayer?.type === 'text') {
                                        updateLayer(selectedLayerId, {
                                            width: e.width,
                                            translate: e.drag.beforeTranslate
                                        })
                                    } else {
                                        updateLayer(selectedLayerId, {
                                            width: e.width,
                                            height: e.height,
                                            translate: e.drag.beforeTranslate
                                        })
                                    }
                                }}

                                onScaleStart={e => {
                                    if (selectedLayerId === 'background') {
                                        e.set(bgTransform.scale)
                                    } else {
                                        const layer = layers.find(l => l.id === selectedLayerId)
                                        if (layer) e.set(layer.scale)
                                    }
                                }}
                                onScale={e => {
                                    // Enforce proportional scaling for text
                                    const finalScale = selectedLayer?.type === 'text'
                                        ? [Math.max(e.scale[0], e.scale[1]), Math.max(e.scale[0], e.scale[1])]
                                        : e.scale;

                                    e.target.style.transform = e.drag.transform
                                    if (selectedLayerId === 'background') {
                                        setBgTransform(prev => ({ ...prev, scale: finalScale, translate: e.drag.beforeTranslate }))
                                    } else {
                                        updateLayer(selectedLayerId, { scale: finalScale, translate: e.drag.beforeTranslate })
                                    }
                                }}
                                onScaleEnd={e => {}}

                                onRotateStart={e => {
                                    if (selectedLayerId === 'background') {
                                        e.set(bgTransform.rotate)
                                    } else {
                                        const layer = layers.find(l => l.id === selectedLayerId)
                                        if (layer) e.set(layer.rotate)
                                    }
                                }}
                                onRotate={e => {
                                    e.target.style.transform = e.transform
                                    if (selectedLayerId === 'background') {
                                        setBgTransform(prev => ({ ...prev, rotate: e.beforeRotate, translate: e.drag.beforeTranslate }))
                                    } else {
                                        updateLayer(selectedLayerId, { rotate: e.beforeRotate, translate: e.drag.beforeTranslate })
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Floating Toolbars/Drawers */}
                <div className="absolute lg:static bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
                    <div className="max-w-xl mx-auto flex flex-col items-center gap-4 pointer-events-auto">
                        
                        {/* Layer Specific Controls */}
                        {selectedLayerId && (
                            <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl px-4 py-3 animate-in slide-in-from-bottom-4">
                                {selectedLayer?.type === 'text' && (
                                    <>
                                        <button
                                            onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false); }}
                                            className="w-10 h-10 rounded-xl border-2 border-white/20 transition-transform active:scale-95"
                                            style={{ backgroundColor: selectedLayer.color }}
                                        />
                                        <button
                                            onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false); }}
                                            className="h-10 px-4 text-white text-sm font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-purple-400" />
                                                ABC
                                            </div>
                                        </button>
                                        <div className="w-px h-6 bg-white/10 mx-1" />
                                    </>
                                )}
                                {selectedLayer?.type === 'image' && (
                                    <button
                                        onClick={() => { setCroppingLayerId(selectedLayerId); setCrop(undefined); }}
                                        className="h-10 px-4 text-white text-sm font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <Crop className="w-4 h-4 text-pink-400" />
                                        Crop
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteLayer(selectedLayerId)}
                                    className="h-10 px-4 text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                                {selectedLayerId === 'background' && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const img = new Image()
                                                img.onload = () => {
                                                    const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height)
                                                    const w = img.width * scale
                                                    const h = img.height * scale
                                                    setBgTransform({
                                                        translate: [(CANVAS_WIDTH - w) / 2, (CANVAS_HEIGHT - h) / 2],
                                                        rotate: 0,
                                                        scale: [1, 1],
                                                        width: Math.round(w),
                                                        height: Math.round(h)
                                                    })
                                                }
                                                img.src = bgImageUrl
                                            }}
                                            className="h-10 px-4 text-white text-sm font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                        >
                                            Smart Fill
                                        </button>
                                        <button
                                            onClick={() => setBgTransform(prev => ({ ...prev, translate: [(CANVAS_WIDTH - prev.width) / 2, (CANVAS_HEIGHT - prev.height) / 2] }))}
                                            className="h-10 px-4 text-white text-sm font-bold bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                        >
                                            Center
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Property Pickers */}
                        {(showColorPicker || showFontPicker) && selectedLayer?.type === 'text' && (
                            <div className="w-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95">
                                {showColorPicker && (
                                    <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1">
                                        {TEXT_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateLayer(selectedLayerId, { color })}
                                                className={`w-10 h-10 rounded-full shrink-0 border-2 transition-all ${selectedLayer?.color === color ? 'border-purple-500 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-white/10 hover:scale-105'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {showFontPicker && (
                                    <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1">
                                        {FONT_STYLES.map(font => (
                                            <button
                                                key={font.id}
                                                onClick={() => updateLayer(selectedLayerId, { fontStyleId: font.id })}
                                                className={`px-5 py-3 whitespace-nowrap text-white rounded-xl transition-all ${selectedLayer?.fontStyleId === font.id ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-white/5 hover:bg-white/10'}`}
                                                style={font.style}
                                            >
                                                {font.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile Quick Actions */}
                        <div className="lg:hidden flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-2 py-2 rounded-full border border-white/10">
                             <button
                                onClick={addTextLayer}
                                className="w-12 h-12 flex items-center justify-center bg-white/5 text-white rounded-full hover:bg-white/10"
                            >
                                <Type className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => layerFileInputRef.current?.click()}
                                className="w-12 h-12 flex items-center justify-center bg-white/5 text-white rounded-full hover:bg-white/10"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[200px]">
                                <button
                                    onClick={() => bgFileInputRef.current?.click()}
                                    className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-zinc-800 border-2 transition-all ${bgType === 'image' ? 'border-purple-500' : 'border-transparent'}`}
                                >
                                    <ImageIcon className="w-5 h-5 text-zinc-400" />
                                </button>
                                {BACKGROUND_GRADIENTS.map((bg, index) => (
                                    <button
                                        key={bg.id}
                                        onClick={() => { setBgType('gradient'); setBgGradientIndex(index); }}
                                        className={`w-10 h-10 rounded-full shrink-0 transition-all ${bgType === 'gradient' && bgGradientIndex === index ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black scale-90' : ''}`}
                                        style={{ background: bg.gradient }}
                                    />
                                ))}
                            </div>
                        </div>
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
                                className="flex-1 py-2.5 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
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
                                className="flex-1 py-2.5 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
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
            {/* Editing Overlay */}
            {isUploading && (
                <div className="absolute inset-0 z-200 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-purple-400 animate-pulse" />
                    </div>
                    <h2 className="mt-8 text-2xl font-bold text-white tracking-tight">Processing Story...</h2>
                    <p className="mt-2 text-zinc-400 font-medium">Creating your high-res masterpiece</p>
                </div>
            )}
        </div>
    )
}
