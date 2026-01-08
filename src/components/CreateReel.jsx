import { useState, useRef, useCallback } from 'react'
import { X, Upload, Loader2, Video, AlertCircle } from 'lucide-react'
import api from '../services/api'
import { useReelStore } from '../stores/reelStore'

export default function CreateReel({ isOpen, onClose }) {
    const [videoFile, setVideoFile] = useState(null)
    const [videoPreview, setVideoPreview] = useState(null)
    const [caption, setCaption] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState(null)
    const [videoDimensions, setVideoDimensions] = useState(null)
    
    const fileInputRef = useRef(null)
    const videoRef = useRef(null)
    const addReel = useReelStore(state => state.addReel)

    // Validate video dimensions (9:16 ratio for vertical)
    const validateVideo = useCallback((file) => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video')
            video.preload = 'metadata'
            
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src)
                const { videoWidth, videoHeight } = video
                const aspectRatio = videoWidth / videoHeight
                
                // Instagram Reels ratio is 9:16 (0.5625)
                // Allow some tolerance (0.5 to 0.65)
                if (aspectRatio > 0.65) {
                    reject(new Error('Video must be vertical (9:16 ratio). Please use a portrait video like Instagram Reels.'))
                    return
                }
                
                // Check duration (max 60 seconds for reels)
                if (video.duration > 60) {
                    reject(new Error('Video must be 60 seconds or less'))
                    return
                }
                
                resolve({
                    width: videoWidth,
                    height: videoHeight,
                    duration: video.duration,
                    aspectRatio
                })
            }
            
            video.onerror = () => {
                reject(new Error('Failed to load video'))
            }
            
            video.src = URL.createObjectURL(file)
        })
    }, [])

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        // Check file type
        if (!file.type.startsWith('video/')) {
            setError('Please select a video file')
            return
        }
        
        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setError('Video must be 50MB or less')
            return
        }
        
        setError(null)
        
        try {
            const dimensions = await validateVideo(file)
            setVideoDimensions(dimensions)
            setVideoFile(file)
            setVideoPreview(URL.createObjectURL(file))
        } catch (err) {
            setError(err.message)
            setVideoFile(null)
            setVideoPreview(null)
        }
    }

    const handleUpload = async () => {
        if (!videoFile) return
        
        setIsUploading(true)
        setUploadProgress(0)
        setError(null)
        
        try {
            // Step 1: Upload video to Cloudinary
            const formData = new FormData()
            formData.append('file', videoFile)
            
            const uploadResponse = await api.post('/reels/upload-video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    setUploadProgress(progress)
                }
            })
            
            const { video_url, thumbnail_url, duration } = uploadResponse.data
            
            // Step 2: Create reel record
            const reelResponse = await api.post('/reels', {
                video_url,
                thumbnail_url,
                caption: caption.trim(),
                duration
            })
            
            // Add to store
            addReel(reelResponse.data)
            
            // Reset and close
            handleClose()
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleClose = () => {
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview)
        }
        setVideoFile(null)
        setVideoPreview(null)
        setCaption('')
        setError(null)
        setUploadProgress(0)
        setVideoDimensions(null)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-(--color-border)">
                    <h2 className="text-xl font-bold text-(--color-text-primary)">Create Reel</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-(--color-bg) transition-colors"
                        disabled={isUploading}
                    >
                        <X className="w-5 h-5 text-(--color-text-secondary)" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Video Upload Area */}
                    {!videoPreview ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[9/16] max-h-96 bg-(--color-bg) border-2 border-dashed border-(--color-border) rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-(--color-primary) transition-colors"
                        >
                            <Video className="w-16 h-16 text-(--color-text-muted) mb-4" />
                            <p className="text-lg font-medium text-(--color-text-primary) mb-1">
                                Upload Video
                            </p>
                            <p className="text-sm text-(--color-text-muted) text-center px-4">
                                Vertical videos only (9:16 ratio)<br />
                                Max 60 seconds • Max 50MB
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Video Preview */}
                            <div className="relative aspect-[9/16] max-h-80 bg-black rounded-xl overflow-hidden mx-auto">
                                <video
                                    ref={videoRef}
                                    src={videoPreview}
                                    className="w-full h-full object-contain"
                                    controls
                                    playsInline
                                />
                                {!isUploading && (
                                    <button
                                        onClick={() => {
                                            URL.revokeObjectURL(videoPreview)
                                            setVideoPreview(null)
                                            setVideoFile(null)
                                            setVideoDimensions(null)
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                )}
                            </div>

                            {/* Video Info */}
                            {videoDimensions && (
                                <div className="text-xs text-(--color-text-muted) text-center">
                                    {videoDimensions.width}×{videoDimensions.height} • {Math.round(videoDimensions.duration)}s
                                </div>
                            )}

                            {/* Caption */}
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Write a caption..."
                                maxLength={2200}
                                className="w-full p-3 border border-(--color-border) rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-(--color-primary) text-(--color-text-primary)"
                                rows={3}
                                disabled={isUploading}
                            />
                            <div className="text-xs text-(--color-text-muted) text-right">
                                {caption.length}/2200
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-(--color-border)">
                    {isUploading ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-(--color-text-secondary)">Uploading...</span>
                                <span className="text-(--color-primary) font-medium">{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-(--color-bg) rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-(--color-primary) transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleUpload}
                            disabled={!videoFile}
                            className="w-full py-3 bg-(--color-primary) text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Upload className="w-5 h-5" />
                            Share Reel
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
