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
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            stream.getTracks().forEach(track => track.stop());
            console.log('[AR] Manual camera stream stopped');

            // 🔥 CRITICAL: 500ms delay to avoid NotReadableError on Android
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('[AR] Camera release delay complete');

            return true;

        } catch (err) {
            console.error('[AR] Camera permission error:', err);

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                throw new Error('Camera permission denied.\n\nPlease allow camera access in your browser settings and reload.');
            } else if (err.name === 'NotFoundError') {
                throw new Error('No camera found.\n\nPlease connect a camera and try again.');
            } else if (err.name === 'NotReadableError') {
                throw new Error('Camera is temporarily unavailable.\n\nPlease close other apps using the camera and reload.');
            } else {
                throw new Error('Camera error: ' + err.message);
            }
        }
    }

    // ==========================================
    // INITIALIZE AR.JS
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

                if (video && video.readyState !== lastReadyState) {
                    lastReadyState = video.readyState;
                    console.log('[AR] Video readyState:', video.readyState,
                        'paused:', video.paused,
                        'width:', video.videoWidth);
                }

                // CASE 1: Video is fully streaming
                if (arSystem && video && video.readyState >= 2) {
                    console.log('[AR] AR.js initialized, video streaming');
                    resolve(arSystem);
                    return;
                }

                // CASE 2: Video loading, waited 2+ seconds
                if (arSystem && video && video.readyState >= 1 && (Date.now() - startTime) > 2000) {
                    console.log('[AR] AR.js ready, video loading');
                    resolve(arSystem);
                    return;
                }

                // CASE 3: Video has width (means it's rendering)
                if (arSystem && video && video.videoWidth > 0) {
                    console.log('[AR] AR.js ready, video has width: ' + video.videoWidth);
                    resolve(arSystem);
                    return;
                }

                // CASE 4: Emergency fallback — requires video element to exist
                if (arSystem && video && (Date.now() - startTime) > 5000) {
                    console.log('[AR] AR.js system exists with video, assuming ready');
                    resolve(arSystem);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    const videoState = video ? 'readyState: ' + video.readyState + ', width: ' + video.videoWidth : 'NO VIDEO';
                    console.error('[AR] Timeout - video state:', videoState);
                    reject(new Error('AR initialization timed out.\n\nVideo state: ' + videoState));
                    return;
                }

                setTimeout(checkARSystem, 100);
            }

            checkARSystem();
        });
    }

    // ==========================================
    // SETUP MARKER EVENTS
    // ==========================================
    function setupMarkerEvents() {
        const marker = document.getElementById('ar-marker');
        if (!marker) {
            console.warn('[AR] Marker element not found');
            return;
        }

        marker.addEventListener('markerFound', () => {
            console.log('[AR] Marker FOUND');
            markerDetected = true;
            hideMarkerPrompt();
            hideLoading();
        });

        marker.addEventListener('markerLost', () => {
            console.log('[AR] Marker LOST');
            markerDetected = false;
            if (!modelLoaded) { showMarkerPrompt(); }
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
    startBtn.addEventListener('click', (e) => { e.preventDefault(); startAR(); });
    reloadBtn.addEventListener('click', () => { window.location.reload(); });

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
        console.log('[AR] 📌 Marker: Hiro (for testing)');
        console.log('[AR] 📐 Model: mode.glb');
    }

    init();

})();