(function() {
    'use strict';

    // ==========================================
    // DOM REFERENCES
    // ==========================================
    const overlay = document.getElementById('permission-overlay');
    const startBtn = document.getElementById('start-btn');
    const errorScreen = document.getElementById('error-screen');
    const errorMessage = document.getElementById('error-message');
    const reloadBtn = document.getElementById('reload-btn');
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const markerPrompt = document.getElementById('marker-prompt');
    const scene = document.getElementById('ar-scene');
    const marker = document.getElementById('ar-marker');

    // ==========================================
    // STATE
    // ==========================================
    let isARStarted = false;
    let markerDetected = false;
    let modelLoaded = false;

    // ==========================================
    // UI HELPERS
    // ==========================================
    function showLoading(text) {
        loadingText.textContent = text || 'Loading AR...';
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }

    function showError(message) {
        errorMessage.textContent = message || 'An unknown error occurred.';
        errorScreen.classList.add('visible');
        overlay.classList.add('hidden');
        hideLoading();
    }

    function showMarkerPrompt() {
        markerPrompt.classList.remove('hidden');
    }

    function hideMarkerPrompt() {
        markerPrompt.classList.add('hidden');
    }

    // ==========================================
    // CHECK REQUIREMENTS
    // ==========================================
    function checkRequirements() {
        if (location.protocol !== 'https:' &&
            location.hostname !== 'localhost' &&
            location.hostname !== '127.0.0.1') {
            throw new Error('HTTPS required.\n\nPlease access this page via a secure connection (https://).');
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported.\n\nPlease use a modern browser like Chrome or Firefox.');
        }

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not available.\n\nYour device or browser may not support 3D rendering.');
        }

        return true;
    }

    // ==========================================
    // REQUEST CAMERA PERMISSION
    // ==========================================
    async function requestCameraPermission() {
        showLoading('Requesting camera access...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            stream.getTracks().forEach(track => track.stop());
            return true;

        } catch (err) {
            console.error('[AR] Camera permission error:', err);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                throw new Error('Camera permission denied.\n\nPlease allow camera access in your browser settings and reload.');
            } else if (err.name === 'NotFoundError') {
                throw new Error('No camera found.\n\nPlease connect a camera and try again.');
            } else if (err.name === 'NotReadableError') {
                throw new Error('Camera is in use by another application.\n\nPlease close other apps using the camera.');
            } else {
                throw new Error('Camera error: ' + err.message);
            }
        }
    }

    // ==========================================
    // INITIALIZE AR.JS (FIXED - Better Video Detection)
    // ==========================================
    function initializeARJS() {
        return new Promise((resolve, reject) => {
            showLoading('Initializing AR engine...');

            scene.setAttribute('arjs', [
                'sourceType: webcam',
                'debugUIEnabled: false',
                'detectionMode: mono_and_matrix',
                'matrixCodeType: 3x3',
                'trackingMethod: best'
            ].join('; '));

            const startTime = Date.now();
            const timeout = 15000;
            let lastReadyState = -1;

            function checkARSystem() {
                const arSystem = scene.systems && scene.systems['arjs'];
                const video = document.querySelector('video');
                
                // Log state changes for debugging
                if (video && video.readyState !== lastReadyState) {
                    lastReadyState = video.readyState;
                    console.log('[AR] Video readyState:', video.readyState, 
                        'paused:', video.paused, 
                        'width:', video.videoWidth);
                }

                // SUCCESS CASE 1: AR system exists AND video is streaming
                if (arSystem && video && video.readyState >= 2) {
                    console.log('[AR] AR.js initialized, video streaming (readyState: ' + video.readyState + ')');
                    resolve(arSystem);
                    return;
                }

                // SUCCESS CASE 2: AR system exists AND video is at least metadata loaded,
                // and we've waited 2+ seconds (video might be slow to start on some devices)
                if (arSystem && video && video.readyState >= 1 && (Date.now() - startTime) > 2000) {
                    console.log('[AR] AR.js ready, video loading (readyState: ' + video.readyState + ')');
                    resolve(arSystem);
                    return;
                }

                // SUCCESS CASE 3: AR system exists AND video has width (means it's rendering)
                if (arSystem && video && video.videoWidth > 0) {
                    console.log('[AR] AR.js ready, video has width: ' + video.videoWidth);
                    resolve(arSystem);
                    return;
                }

                // SUCCESS CASE 4: AR system exists AND we've waited 5+ seconds
                // (emergency fallback - maybe readyState never updates but video works)
                if (arSystem && (Date.now() - startTime) > 5000) {
                    console.log('[AR] AR.js system exists, assuming ready (video may be slow to report)');
                    resolve(arSystem);
                    return;
                }

                // Timeout
                if (Date.now() - startTime > timeout) {
                    const videoState = video ? 'readyState: ' + video.readyState + ', width: ' + video.videoWidth : 'NO VIDEO';
                    console.error('[AR] Timeout - video state:', videoState);
                    reject(new Error('AR initialization timed out.\n\nVideo state: ' + videoState));
                    return;
                }

                // Keep checking
                setTimeout(checkARSystem, 100);
            }

            checkARSystem();
        });
    }

    // ==========================================
    // SETUP MARKER EVENTS
    // ==========================================
    function setupMarkerEvents() {
        const markerEl = document.getElementById('ar-marker');
        if (!markerEl) {
            console.warn('[AR] Marker element not found');
            return;
        }

        markerEl.addEventListener('markerFound', () => {
            console.log('[AR] Marker FOUND');
            markerDetected = true;
            hideMarkerPrompt();
            hideLoading();
        });

        markerEl.addEventListener('markerLost', () => {
            console.log('[AR] Marker LOST');
            markerDetected = false;
            if (!modelLoaded) {
                showMarkerPrompt();
            }
        });

        console.log('[AR] Marker events configured');
    }

    // ==========================================
    // SETUP MODEL EVENTS
    // ==========================================
    function setupModelEvents() {
        const model = document.getElementById('model-entity');
        if (!model) {
            console.warn('[AR] Model entity not found');
            hideLoading();
            return;
        }

        model.addEventListener('model-loaded', () => {
            console.log('[AR] Model LOADED');
            modelLoaded = true;
            hideLoading();
        });

        model.addEventListener('model-error', (event) => {
            console.warn('[AR] Model ERROR:', event.detail);
            hideLoading();
        });

        if (model.hasLoaded) {
            console.log('[AR] Model already loaded');
            modelLoaded = true;
            hideLoading();
        }
    }

    // ==========================================
    // MAIN START FUNCTION
    // ==========================================
    async function startAR() {
        if (isARStarted) return;

        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';

        try {
            showLoading('Checking device...');
            checkRequirements();

            await requestCameraPermission();

            overlay.classList.add('hidden');

            await initializeARJS();

            setupMarkerEvents();
            setupModelEvents();

            showMarkerPrompt();

            setTimeout(() => {
                if (!modelLoaded && !markerDetected) {
                    hideLoading();
                    showMarkerPrompt();
                }
            }, 5000);

            isARStarted = true;
            console.log('[AR] AR experience ready');

        } catch (err) {
            console.error('[AR] Start error:', err);
            showError(err.message);
            startBtn.disabled = false;
            startBtn.textContent = 'Start AR';
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startAR();
    });

    reloadBtn.addEventListener('click', () => {
        window.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('[AR] Page hidden');
        } else {
            console.log('[AR] Page visible');
        }
    });

    // ==========================================
    // INITIAL STATE
    // ==========================================
    function init() {
        overlay.classList.remove('hidden');
        errorScreen.classList.remove('visible');
        loading.classList.add('hidden');
        markerPrompt.classList.add('hidden');

        console.log('[AR] App initialized');
        console.log('[AR] 📌 BARCODE MARKER CONFIG:');
        console.log('[AR]    Marker ID: 0 (change value="X" in index.html)');
        console.log('[AR]    Physical marker: QR code with embedded barcode pattern');
        console.log('[AR]    Generated separately - not part of this codebase');
        console.log('[AR] 🔧 QUIRKS:');
        console.log('[AR]    - Android Chrome: Works best with 3x3 matrix codes');
        console.log('[AR]    - iOS Safari: Requires iOS 15+, may need user gesture to start video');
        console.log('[AR]    - Camera: Always use environment-facing (rear) camera for markers');
        console.log('[AR] 📐 SCALE NOTE:');
        console.log('[AR]    Current scale: 0.15 0.15 0.15 (adjust based on your model)');
        console.log('[AR]    Sketchfab models vary in native unit scale — test and tweak!');
        console.log('[AR] 🔥 FIXES APPLIED:');
        console.log('[AR]    - animation: Using A-Frame component (not <a-animation> tag)');
        console.log('[AR]    - AR.js detection: Multi-stage fallback for video readiness');
    }

    init();

})();