import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
            return
        }

        // Check if previously dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (dismissed) {
            const dismissedTime = parseInt(dismissed)
            // Show again after 7 days
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                return
            }
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing
            e.preventDefault()
            // Save the event for later
            setDeferredPrompt(e)
            // Show custom install prompt after a delay
            setTimeout(() => setShowPrompt(true), 3000)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setShowPrompt(false)
            setDeferredPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        // Show the install prompt
        deferredPrompt.prompt()

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice
        console.log('Install outcome:', outcome)

        // Clear the deferred prompt
        setDeferredPrompt(null)
        setShowPrompt(false)
    }

    const handleDismiss = () => {
        setShowPrompt(false)
        localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }

    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:bottom-4 lg:w-80 bg-white rounded-xl shadow-xl border border-(--color-border) p-4 z-50 animate-slideUp">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 text-(--color-text-muted) hover:text-(--color-text-primary) transition"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-(--color-primary) rounded-xl flex items-center justify-center shrink-0">
                    <Download className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-(--color-text-primary) mb-1">
                        Install Nexa
                    </h3>
                    <p className="text-sm text-(--color-text-muted) mb-3">
                        Add Nexa to your home screen for quick access and a better experience.
                    </p>

                    <button
                        onClick={handleInstall}
                        className="w-full py-2 px-4 bg-(--color-primary) text-white font-medium rounded-lg hover:bg-(--color-primary-dark) transition"
                    >
                        Install App
                    </button>
                </div>
            </div>
        </div>
    )
}
