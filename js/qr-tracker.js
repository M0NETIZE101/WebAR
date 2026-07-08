export class QRTracker {
    constructor() {
        this.isTracking = false;
        this.qrScanner = null;
        this.callback = null;
        this.videoElement = null;
        this.mediaStream = null;
        this.detectedQRCodes = new Set();
    }
    
    async startTracking(callback) {
        if (this.isTracking) return;
        this.callback = callback;
        
        try {
            // Get camera stream
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            
            // Create hidden video element
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.mediaStream;
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.style.display = 'none';
            document.body.appendChild(this.videoElement);
            
            await this.videoElement.play();
            
            // Setup canvas for processing
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            
            this.isTracking = true;
            
            // Load QR scanner library dynamically
            await this.loadQRScanner();
            
            // Start scanning loop
            this.scanLoop(canvas, ctx);
            
            console.log('QR tracking started');
            
        } catch (error) {
            console.error('Failed to start QR tracking:', error);
            // QR tracking is optional, so we don't throw error
            this.showFallbackStatus('QR tracking unavailable, using manual placement');
        }
    }
    
    async loadQRScanner() {
        // Load jsQR library for QR code scanning
        if (!window.jsQR) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }
    
    scanLoop(canvas, ctx) {
        if (!this.isTracking) return;
        
        try {
            // Draw video frame
            ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Decode QR code
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code && code.data) {
                const qrData = code.data;
                
                // Avoid duplicate detections
                if (!this.detectedQRCodes.has(qrData)) {
                    this.detectedQRCodes.add(qrData);
                    
                    if (this.callback) {
                        this.callback(qrData);
                    }
                }
            }
            
        } catch (error) {
            // Silent error - continue scanning
        }
        
        // Continue loop
        requestAnimationFrame(() => this.scanLoop(canvas, ctx));
    }
    
    showFallbackStatus(message) {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = 'ℹ️ ' + message;
            statusEl.className = 'visible';
            setTimeout(() => {
                statusEl.className = '';
            }, 3000);
        }
    }
    
    stopTracking() {
        this.isTracking = false;
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.videoElement && this.videoElement.parentNode) {
            this.videoElement.parentNode.removeChild(this.videoElement);
        }
        
        this.detectedQRCodes.clear();
    }
}