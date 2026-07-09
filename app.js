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
    // 🔥 FORCE FULLSCREEN LAYERS — RUN ONCE
    // ==========================================
    let layersFixed = false;

    function forceFullscreenLayers() {
        // Only run once
        if (layersFixed) return;
        
        const videos = document.querySelectorAll('video');
        const canvas = document.querySelector('canvas');
        const sceneEl = document.querySelector('a-scene');

        // Force body to fullscreen
        document.body.style.cssText =
            'margin:0!important;' +
            'padding:0!important;' +
            'width:100vw!important;' +
            'height:100vh!important;' +
            'overflow:hidden!important;' +
            'position:fixed!important;' +
            'top:0!important;' +
            'left:0!important;' +
            'background:#000!important;' +
            'max-width:100vw!important;' +
            'max-height:100vh!important;';

        // Force HTML to fullscreen
        document.documentElement.style.cssText =
            'margin:0!important;' +
            'padding:0!important;' +
            'width:100vw!important;' +
            'height:100vh!important;' +
            'overflow:hidden!important;' +
            'background:#000!important;' +
            'max-width:100vw!important;' +
            'max-height:100vh!important;';

        videos.forEach((video) => {
            // Only set styles if not already set
            if (!video._fixed) {
                video.style.cssText =
                    'position:fixed!important;' +
                    'top:0!important;' +
                    'left:0!important;' +
                    'width:100vw!important;' +
                    'height:100vh!important;' +
                    'min-width:100vw!important;' +
                    'min-height:100vh!important;' +
                    'max-width:100vw!important;' +
                    'max-height:100vh!important;' +
                    'object-fit:cover!important;' +
                    'z-index:0!important;' +
                    'pointer-events:none!important;' +
                    'background:#000!important;' +
                    'margin:0!important;' +
                    'padding:0!important;' +
                    'border:none!important;' +
                    'transform:none!important;' +
                    'transform-origin:0 0!important;' +
                    'clip:none!important;';
                video._fixed = true;
                console.log('[AR] ✅ Video forced to fullscreen');
            }
        });

        if (canvas && !canvas._fixed) {
            canvas.style.cssText =
                'position:fixed!important;' +
                'top:0!important;' +
                'left:0!important;' +
                'width:100vw!important;' +
                'height:100vh!important;' +
                'min-width:100vw!important;' +
                'min-height:100vh!important;' +
                'max-width:100vw!important;' +
                'max-height:100vh!important;' +
                'z-index:10!important;' +
                'background:transparent!important;' +
                'pointer-events:auto!important;' +
                'margin:0!important;' +
                'padding:0!important;' +
                'border:none!important;' +
                'transform:none!important;';
            canvas._fixed = true;
            console.log('[AR] ✅ Canvas forced to fullscreen');
        }

        if (sceneEl && !sceneEl._fixed) {
            sceneEl.style.cssText =
                'position:fixed!important;' +
                'top:0!important;' +
                'left:0!important;' +
                'width:100vw!important;' +
                'height:100vh!important;' +
                'max-width:100vw!important;' +
                'max-height:100vh!important;' +
                'z-index:1!important;' +
                'background:transparent!important;' +
                'overflow:hidden!important;' +
                'margin:0!important;' +
                'padding:0!important;' +
                'border:none!important;';
            sceneEl._fixed = true;
            console.log('[AR] ✅ Scene forced to fullscreen');
        }

        layersFixed = true;
    }

    // ==========================================
    // CHECK REQUIREMENTS
    // ==========================================
    function checkRequirements() {
        console.log('[AR] Checking requirements...');

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

        console.log('[AR] ✅ Requirements passed');
        return true;
    }

    // ==========================================
    // REQUEST CAMERA PERMISSION
    // ==========================================
    async function requestCameraPermission() {
        showLoading('Requesting camera access...');
        console.log('[AR] Requesting camera permission...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            stream.getTracks().forEach(track => track.stop());
            console.log('[AR] ✅ Manual camera stream stopped');

            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('[AR] ✅ Camera release delay complete');

            return true;

        } catch (err) {
            console.error('[AR] ❌ Camera permission error:', err);

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
            console.log('[AR] Initializing AR.js...');

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

                if (arSystem && video && video.readyState >= 2) {
                    console.log('[AR] ✅ AR.js initialized, video streaming');
                    resolve(arSystem);
                    return;
                }

                if (arSystem && video && video.readyState >= 1 && (Date.now() - startTime) > 2000) {
                    console.log('[AR] ✅ AR.js ready, video loading');
                    resolve(arSystem);
                    return;
                }

                if (arSystem && video && video.videoWidth > 0) {
                    console.log('[AR] ✅ AR.js ready, video has width: ' + video.videoWidth);
                    resolve(arSystem);
                    return;
                }

                if (arSystem && video && (Date.now() - startTime) > 5000) {
                    console.log('[AR] ⚠️ AR.js system exists with video, assuming ready');
                    resolve(arSystem);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    const videoState = video ? 'readyState: ' + video.readyState + ', width: ' + video.videoWidth : 'NO VIDEO';
                    console.error('[AR] ❌ Timeout - video state:', videoState);
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
            console.warn('[AR] ⚠️ Marker element not found');
            return;
        }

        marker.addEventListener('markerFound', () => {
            console.log('[AR] ✅✅✅ MARKER FOUND ✅✅✅');
            markerDetected = true;
            hideMarkerPrompt();
            hideLoading();
        });

        marker.addEventListener('markerLost', () => {
            console.log('[AR] ❌❌❌ MARKER LOST ❌❌❌');
            markerDetected = false;
            if (!modelLoaded) { showMarkerPrompt(); }
        });

        console.log('[AR] ✅ Marker events configured');
    }

    // ==========================================
    // SETUP MODEL EVENTS
    // ==========================================
    function setupModelEvents() {
        const model = document.getElementById('model-entity');
        if (!model) {
            console.warn('[AR] ⚠️ Model entity not found');
            hideLoading();
            return;
        }

        model.addEventListener('model-loaded', () => {
            console.log('[AR] ✅✅✅ MODEL LOADED ✅✅✅');
            modelLoaded = true;
            hideLoading();
        });

        model.addEventListener('model-error', (event) => {
            console.warn('[AR] ❌ Model ERROR:', event.detail);
            hideLoading();
        });

        if (model.hasLoaded) {
            console.log('[AR] ✅ Model already loaded');
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
        console.log('[AR] 🚀 Starting AR...');

        try {
            showLoading('Checking device...');
            checkRequirements();

            await requestCameraPermission();

            overlay.classList.add('hidden');

            await initializeARJS();

            // 🔥 Force layers ONCE after AR starts
            setTimeout(forceFullscreenLayers, 500);

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
            console.log('[AR] 🎉 AR experience ready!');

        } catch (err) {
            console.error('[AR] ❌ Start error:', err);
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
        console.log('[AR] 👆 Start button clicked');
        startAR();
    });

    reloadBtn.addEventListener('click', () => {
        console.log('[AR] 🔄 Reloading...');
        window.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('[AR] 📱 Page hidden');
        } else {
            console.log('[AR] 📱 Page visible');
            if (isARStarted) {
                // Re-apply layers when coming back, but only if not already fixed
                if (!layersFixed) {
                    setTimeout(forceFullscreenLayers, 100);
                }
            }
        }
    });

    // ==========================================
    // 🔍 CONSOLE DEBUGGING TOOLKIT
    // ==========================================
    window.ARDebug = {
        elements: function() {
            console.group('🔍 AR Elements Status');
            const checks = {
                'Scene': document.getElementById('ar-scene'),
                'Marker': document.getElementById('ar-marker'),
                'Model Entity': document.getElementById('model-entity'),
                'Video': document.querySelector('video'),
                'Canvas': document.querySelector('canvas'),
            };
            for (const [name, el] of Object.entries(checks)) {
                console.log(`${name}: ${el ? '✅ EXISTS' : '❌ MISSING'}`);
            }
            console.groupEnd();
        },
        layers: function() {
            const video = document.querySelector('video');
            const canvas = document.querySelector('canvas');
            console.log('Video z-index:', video?.style.zIndex);
            console.log('Canvas z-index:', canvas?.style.zIndex);
            console.log('Video size:', video?.style.width, video?.style.height);
            console.log('Canvas size:', canvas?.style.width, canvas?.style.height);
            console.log('Video left:', video?.style.left);
            console.log('Video top:', video?.style.top);
        },
        forceLayers: function() {
            layersFixed = false;
            forceFullscreenLayers();
        },
        all: function() {
            console.log('🔍 ===== AR DEBUG ALL =====');
            this.elements();
            this.layers();
            console.log('🔍 ===== END =====');
        }
    };

    // ==========================================
    // INITIAL STATE
    // ==========================================
    function init() {
        overlay.classList.remove('hidden');
        errorScreen.classList.remove('visible');
        loading.classList.add('hidden');
        markerPrompt.classList.add('hidden');

        console.log('[AR] 🚀 App initialized');
        console.log('[AR] 🔧 Run ARDebug.all() in console for diagnostics');
    }

    init();

})();