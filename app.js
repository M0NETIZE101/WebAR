(function() {
    'use strict';

    // ==========================================
    // DOM REFS
    // ==========================================
    const landing = document.getElementById('landing');
    const launchBtn = document.getElementById('launchBtn');
    const arOverlay = document.getElementById('arOverlay');
    const backBtn = document.getElementById('backBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const scanHint = document.getElementById('scanHint');
    const arLoading = document.getElementById('arLoading');
    const loadingText = document.getElementById('loadingText');
    const toastEl = document.getElementById('toast');
    const modelBtns = document.querySelectorAll('.mbtn');

    let toastTimer;
    let isARActive = false;
    let isPlaced = false;

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    function showToast(msg, dur = 3000) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
    }

    // ==========================================
    // FORCE VIDEO FULLSCREEN
    // ==========================================
    function forceVideoFullscreen() {
        let attempts = 0;
        const maxAttempts = 20;
        
        const interval = setInterval(() => {
            const video = document.querySelector('video');
            const canvas = document.querySelector('canvas');
            
            if (video) {
                video.style.position = 'fixed';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100vw';
                video.style.height = '100vh';
                video.style.maxWidth = '100vw';
                video.style.maxHeight = '100vh';
                video.style.objectFit = 'cover';
                video.style.zIndex = '1';
                video.style.display = 'block';
                video.style.backgroundColor = '#000';
            }
            
            if (canvas) {
                canvas.style.position = 'fixed';
                canvas.style.top = '0';
                canvas.style.left = '0';
                canvas.style.width = '100vw';
                canvas.style.height = '100vh';
                canvas.style.maxWidth = '100vw';
                canvas.style.maxHeight = '100vh';
                canvas.style.display = 'block';
                canvas.style.zIndex = '2';
            }
            
            const scene = document.querySelector('a-scene');
            if (scene) {
                scene.style.position = 'fixed';
                scene.style.top = '0';
                scene.style.left = '0';
                scene.style.width = '100vw';
                scene.style.height = '100vh';
                scene.style.zIndex = '1';
            }
            
            attempts++;
            if (attempts >= maxAttempts || (video && canvas)) {
                clearInterval(interval);
                console.log('[AR] Fullscreen force complete');
            }
        }, 100);
    }

    // ==========================================
    // CREATE A-FRAME SCENE
    // ==========================================
    function createScene() {
        const oldScene = document.querySelector('a-scene');
        if (oldScene) oldScene.remove();

        const scene = document.createElement('a-scene');
        scene.setAttribute('embedded', '');
        scene.setAttribute('vr-mode-ui', 'enabled: false');
        scene.setAttribute('renderer', 'logarithmicDepthBuffer: true; antialias: true; precision: mediump; alpha: true;');
        scene.setAttribute('loading-screen', 'enabled: false');
        scene.setAttribute('arjs',
            'sourceType: webcam; debugUIEnabled: false; detectionMode: mono; trackingMethod: best;'
        );

        // 🔥 FIXED: Only crow is visible by default, others hidden
        scene.innerHTML = `
            <!-- Model container - starts hidden, becomes visible on tap -->
            <a-entity id="model-container" position="0 0 -1" visible="false">
                
                <!-- 🐦 CROW MODEL (DEFAULT - VISIBLE) -->
                <a-entity 
                    id="crow-model" 
                    gltf-model="url(models/animated_crow/scene.gltf)" 
                    scale="0.5 0.5 0.5" 
                    rotation="0 0 0"
                    animation-mixer="clip: *; loop: repeat"
                    visible="true"
                ></a-entity>
                
                <!-- 🚗 CAR MODEL (HIDDEN) -->
                <a-entity 
                    id="car-model" 
                    gltf-model="url(car.glb)" 
                    scale="0.15 0.15 0.15" 
                    rotation="0 0 0"
                    animation-mixer="clip: *; loop: repeat"
                    visible="false"
                ></a-entity>
                
                <!-- 💎 CRYSTAL MODEL (HIDDEN) -->
                <a-entity id="crystal-model" visible="false">
                    <a-box position="0 0.5 0" scale="0.3 0.3 0.3" material="color: #00ffaa; shader: flat;"></a-box>
                    <a-torus-knot position="0 0.3 0" scale="0.2 0.2 0.2" material="color: #00c8ff; wireframe: true;"></a-torus-knot>
                </a-entity>
                
                <!-- 🌞 SOLAR SYSTEM MODEL (HIDDEN) -->
                <a-entity id="solar-model" visible="false">
                    <a-sphere position="0 0.5 0" scale="0.15 0.15 0.15" material="color: #ffaa00;"></a-sphere>
                    <a-torus position="0 0.5 0" scale="0.3 0.3 0.3" rotation="90 0 0" material="color: #ffffff; transparent: true; opacity: 0.2;"></a-torus>
                    <a-torus position="0 0.5 0" scale="0.4 0.4 0.4" rotation="90 0 0" material="color: #ffffff; transparent: true; opacity: 0.1;"></a-torus>
                </a-entity>
                
                <!-- 🚀 ROCKET MODEL (HIDDEN) -->
                <a-entity id="rocket-model" visible="false">
                    <a-cone position="0 0.6 0" scale="0.1 0.2 0.1" material="color: #ff2d2d;"></a-cone>
                    <a-cylinder position="0 0.3 0" scale="0.08 0.2 0.08" material="color: #eeeeee;"></a-cylinder>
                    <a-cone position="0 -0.05 0" scale="0.04 0.08 0.04" material="color: #ff8800;"></a-cone>
                    <a-cylinder position="0 -0.15 0" scale="0.06 0.04 0.06" material="color: #444455;"></a-cylinder>
                </a-entity>
            </a-entity>

            <a-entity camera></a-entity>
        `;

        document.body.appendChild(scene);

        setTimeout(forceVideoFullscreen, 300);

        // Setup tap to place
        setupPlacement(scene);

        // Setup model switching
        setupModelSwitching();

        return scene;
    }

    // ==========================================
    // TAP TO PLACE - FIXED
    // ==========================================
    function setupPlacement(scene) {
        const container = document.getElementById('model-container');
        if (!container) {
            console.error('[AR] Container not found!');
            return;
        }

        // Get the canvas for click events
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            console.error('[AR] Canvas not found!');
            return;
        }

        // 🔥 FIXED: Clearer placement logic
        const placeModel = function(event) {
            // Get camera position and direction
            const camera = document.querySelector('a-entity[camera]');
            if (!camera) {
                console.warn('[AR] Camera not found');
                return;
            }

            // Get camera's world position and forward direction
            const pos = camera.object3D.position.clone();
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyQuaternion(camera.object3D.quaternion);
            
            // Place model 1 meter in front of camera, slightly above ground
            const distance = 1.0;
            const targetPos = pos.clone().add(dir.multiplyScalar(distance));
            targetPos.y = -0.15; // Slightly above floor level

            // Update container position and make visible
            container.setAttribute('position', targetPos);
            container.setAttribute('visible', 'true');
            
            // Log for debugging
            console.log('[AR] Model placed at:', targetPos);
            
            // Update UI
            if (!isPlaced) {
                isPlaced = true;
                scanHint.classList.add('hidden');
                showToast('Model placed! Tap again to move', 1500);
            } else {
                showToast('Model moved!', 1000);
            }
        };

        // Add click listener
        canvas.addEventListener('click', placeModel);
        console.log('[AR] Click listener added to canvas');

        // Touch support for mobile
        canvas.addEventListener('touchstart', function(event) {
            // Prevent default to avoid scrolling
            event.preventDefault();
            
            const touch = event.touches[0];
            if (!touch) return;
            
            // Create a simulated click event
            const clickEvent = new MouseEvent('click', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(clickEvent);
        }, { passive: false });

        console.log('[AR] Tap to place setup complete');
    }

    // ==========================================
    // MODEL SWITCHING - FIXED
    // ==========================================
    function setupModelSwitching() {
        const models = {
            crow: 'crow-model',
            car: 'car-model',
            crystal: 'crystal-model',
            solar: 'solar-model',
            rocket: 'rocket-model'
        };

        // 🔥 FIXED: Default to crow
        let currentModel = 'crow';

        modelBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const modelKey = this.dataset.model;
                if (modelKey === currentModel) return;

                // Update button states
                modelBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Hide all models, show only the selected one
                const modelIds = Object.values(models);
                modelIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.setAttribute('visible', id === models[modelKey]);
                    }
                });

                currentModel = modelKey;
                showToast('Switched to ' + modelKey.charAt(0).toUpperCase() + modelKey.slice(1));
                console.log('[AR] Switched to:', modelKey);
            });
        });

        // 🔥 FIXED: Set crow as active initially
        modelBtns.forEach(btn => {
            if (btn.dataset.model === 'crow') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ==========================================
    // WAIT FOR AR SYSTEM
    // ==========================================
    function waitForAR(scene, timeout) {
        return new Promise((resolve, reject) => {
            const start = Date.now();

            function check() {
                const arSystem = scene.systems && scene.systems['arjs'];
                
                if (arSystem) {
                    console.log('[AR] System ready');
                    resolve(arSystem);
                    return;
                }

                if (Date.now() - start > timeout) {
                    reject(new Error('AR initialization timed out.'));
                    return;
                }

                setTimeout(check, 100);
            }

            check();
        });
    }

    // ==========================================
    // MAIN START
    // ==========================================
    async function startAR() {
        if (isARActive) return;
        
        arLoading.classList.add('active');
        loadingText.textContent = 'Requesting camera...';

        try {
            // Check HTTPS
            if (location.protocol !== 'https:' && 
                !['localhost', '127.0.0.1', ''].includes(location.hostname)) {
                throw new Error('HTTPS required. Please use a secure connection.');
            }

            // Check camera API
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported.');
            }

            // Create scene
            loadingText.textContent = 'Initializing AR...';
            const scene = createScene();

            // Wait for AR system
            loadingText.textContent = 'Starting AR engine...';
            await waitForAR(scene, 15000);

            // AR is ready
            isARActive = true;
            arLoading.classList.remove('active');
            landing.classList.add('hidden');
            arOverlay.classList.add('active');
            
            statusDot.classList.add('found');
            statusText.textContent = 'Tap to place';
            
            // Show hint
            scanHint.classList.remove('hidden');

            // Hide hint after first placement OR after 5 seconds
            const canvas = document.querySelector('canvas');
            if (canvas) {
                const hideHint = function() {
                    scanHint.classList.add('hidden');
                    canvas.removeEventListener('click', hideHint);
                    canvas.removeEventListener('touchstart', hideHint);
                };
                canvas.addEventListener('click', hideHint, { once: true });
                canvas.addEventListener('touchstart', hideHint, { once: true });
            }

            // Auto-hide hint after 5 seconds
            setTimeout(() => {
                scanHint.classList.add('hidden');
            }, 5000);

            showToast('AR Ready! Tap screen to place model', 2000);
            console.log('[AR] Markerless AR ready!');
            console.log('[AR] Tap the screen to place the model');

        } catch (err) {
            console.error('[AR] Error:', err);
            arLoading.classList.remove('active');
            
            let msg = err.message;
            if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                msg = 'Camera permission denied. Please allow and reload.';
            }
            showToast('Failed: ' + msg, 5000);
        }
    }

    // ==========================================
    // STOP AR
    // ==========================================
    function stopAR() {
        const scene = document.querySelector('a-scene');
        if (scene) scene.remove();
        
        isARActive = false;
        isPlaced = false;
        arOverlay.classList.remove('active');
        landing.classList.remove('hidden');
        statusDot.classList.remove('found');
        statusText.textContent = 'Scanning surfaces...';
        scanHint.classList.add('hidden');
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    launchBtn.addEventListener('click', startAR);
    backBtn.addEventListener('click', stopAR);

    // Prevent zoom gestures
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    window.addEventListener('resize', () => {
        if (isARActive) {
            forceVideoFullscreen();
        }
    });

    console.log('[AR] App ready - markerless mode');
    console.log('[AR] Models: car.glb, animated_crow/scene.gltf, and procedural models');
    console.log('[AR] Default model: Crow');
})();
