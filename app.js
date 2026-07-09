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
    // FORCE CANVAS ON TOP OF VIDEO
    // ==========================================
    function forceCanvasOnTop() {
        const canvas = document.querySelector('canvas');
        const video = document.querySelector('video');
        
        if (canvas) {
            canvas.style.setProperty('z-index', '10', 'important');
            canvas.style.setProperty('position', 'fixed', 'important');
            canvas.style.setProperty('top', '0', 'important');
            canvas.style.setProperty('left', '0', 'important');
            canvas.style.setProperty('width', '100%', 'important');
            canvas.style.setProperty('height', '100%', 'important');
            canvas.style.setProperty('background', 'transparent', 'important');
            canvas.style.setProperty('pointer-events', 'auto', 'important');
            console.log('[AR] ✅ Canvas z-index forced to 10');
        } else {
            console.warn('[AR] ⚠️ Canvas not found yet, retrying...');
            setTimeout(forceCanvasOnTop, 500);
            return;
        }

        if (video) {
            video.style.setProperty('z-index', '0', 'important');
            video.style.setProperty('position', 'fixed', 'important');
            video.style.setProperty('top', '0', 'important');
            video.style.setProperty('left', '0', 'important');
            video.style.setProperty('width', '100vw', 'important');
            video.style.setProperty('height', '100vh', 'important');
            video.style.setProperty('object-fit', 'cover', 'important');
            video.style.setProperty('pointer-events', 'none', 'important');
            console.log('[AR] ✅ Video z-index forced to 0');
        }

        const sceneEl = document.querySelector('a-scene');
        if (sceneEl) {
            sceneEl.style.setProperty('z-index', '1', 'important');
            console.log('[AR] ✅ Scene z-index forced to 1');
        }
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

            // 🔥 500ms delay for Android
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

                // Log video state changes
                if (video && video.readyState !== lastReadyState) {
                    lastReadyState = video.readyState;
                    console.log('[AR] Video readyState:', video.readyState,
                        'paused:', video.paused,
                        'width:', video.videoWidth);
                }

                // CASE 1: Video is fully streaming
                if (arSystem && video && video.readyState >= 2) {
                    console.log('[AR] ✅ AR.js initialized, video streaming');
                    resolve(arSystem);
                    return;
                }

                // CASE 2: Video loading, waited 2+ seconds
                if (arSystem && video && video.readyState >= 1 && (Date.now() - startTime) > 2000) {
                    console.log('[AR] ✅ AR.js ready, video loading');
                    resolve(arSystem);
                    return;
                }

                // CASE 3: Video has width (means it's rendering)
                if (arSystem && video && video.videoWidth > 0) {
                    console.log('[AR] ✅ AR.js ready, video has width: ' + video.videoWidth);
                    resolve(arSystem);
                    return;
                }

                // CASE 4: Emergency fallback
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

            // 🔥 FORCE CANVAS ON TOP OF VIDEO
            forceCanvasOnTop();

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
        }
    });

    // ==========================================
    // 🔍 CONSOLE DEBUGGING TOOLKIT
    // ==========================================
    window.ARDebug = {
        // 1. Check all critical elements
        elements: function() {
            console.group('🔍 AR Elements Status');
            const checks = {
                'Scene': document.getElementById('ar-scene'),
                'Marker': document.getElementById('ar-marker'),
                'Model Entity': document.getElementById('model-entity'),
                'Camera': document.querySelector('a-entity[camera]'),
                'Video': document.querySelector('video'),
                'Canvas': document.querySelector('canvas'),
            };
            for (const [name, el] of Object.entries(checks)) {
                console.log(`${name}: ${el ? '✅ EXISTS' : '❌ MISSING'}`);
                if (el && el.tagName === 'VIDEO') {
                    console.log(`  - readyState: ${el.readyState} (4 = streaming)`);
                    console.log(`  - paused: ${el.paused}`);
                    console.log(`  - width: ${el.videoWidth}`);
                    console.log(`  - srcObject: ${el.srcObject ? '✅ SET' : '❌ NOT SET'}`);
                    console.log(`  - z-index: ${el.style.zIndex || getComputedStyle(el).zIndex}`);
                }
                if (el && el.tagName === 'CANVAS') {
                    console.log(`  - width: ${el.width}, height: ${el.height}`);
                    console.log(`  - z-index: ${el.style.zIndex || getComputedStyle(el).zIndex}`);
                }
            }
            console.groupEnd();
        },

        // 2. Check AR.js system
        arSystem: function() {
            console.group('🔍 AR.js System');
            const arSystem = scene?.systems?.['arjs'];
            if (arSystem) {
                console.log('✅ AR System: EXISTS');
                console.log('  - tracking:', arSystem.trackingMethod || 'unknown');
                console.log('  - detectionMode:', arSystem.detectionMode || 'unknown');
            } else {
                console.log('❌ AR System: NOT FOUND');
            }
            console.groupEnd();
        },

        // 3. Check model status
        model: function() {
            console.group('🔍 Model Status');
            const model = document.getElementById('model-entity');
            if (model) {
                console.log('✅ Model entity: EXISTS');
                console.log('  - loaded:', model.hasLoaded ? '✅ YES' : '⏳ NO');
                console.log('  - scale:', model.getAttribute('scale'));
                console.log('  - position:', model.getAttribute('position'));
                console.log('  - visible:', model.getAttribute('visible'));
                console.log('  - material:', model.getAttribute('material') || 'None (using GLTF)');
                console.log('  - z-index:', getComputedStyle(model).zIndex);
            } else {
                console.log('❌ Model entity: NOT FOUND');
            }
            console.groupEnd();
        },

        // 4. Check z-index layering
        layers: function() {
            console.group('🔍 Z-Index Layering');
            const video = document.querySelector('video');
            const canvas = document.querySelector('canvas');
            const scene = document.querySelector('a-scene');
            
            if (video) {
                console.log('Video z-index:', getComputedStyle(video).zIndex || video.style.zIndex || 'default');
            }
            if (canvas) {
                console.log('Canvas z-index:', getComputedStyle(canvas).zIndex || canvas.style.zIndex || 'default');
            }
            if (scene) {
                console.log('Scene z-index:', getComputedStyle(scene).zIndex || scene.style.zIndex || 'default');
            }
            console.groupEnd();
        },

        // 5. Force canvas to top (manual fix)
        forceCanvasTop: function() {
            forceCanvasOnTop();
            console.log('✅ Canvas forced to top');
        },

        // 6. Run all checks
        all: function() {
            console.log('🔍 ===== AR DEBUG ALL =====');
            this.elements();
            this.arSystem();
            this.model();
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
        console.log('[AR] 📌 Marker: Hiro');
        console.log('[AR] 📐 Model: model.glb');
        console.log('[AR] 🔍 Check console for debug logs');
        console.log('[AR] 💡 Click "Start AR" to begin');
        console.log('[AR] 🔧 Run ARDebug.all() in console for full diagnostics');
        console.log('[AR] 🎨 Materials: Keeping original GLTF textures');
    }

    init();

})();