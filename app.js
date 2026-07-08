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
        scene.setAttribute('renderer', 'logarithmicDepthBuffer: true; antialias: true; precision: mediump');
        scene.setAttribute('loading-screen', 'enabled: false');
        scene.setAttribute('arjs',
            'sourceType: webcam; debugUIEnabled: false; detectionMode: mono; trackingMethod: best;'
        );

        scene.innerHTML = `
            <!-- Hit testing for markerless placement -->
            <a-entity id="hit-test" hit-testing="enabled: true;"></a-entity>
            
            <!-- Model container - placed on tap -->
            <a-entity id="model-container" position="0 0 -1" visible="false">
                
                <!-- 🚗 CAR MODEL (from car.glb file) -->
                <a-entity 
                    id="car-model" 
                    gltf-model="url(car.glb)" 
                    scale="0.15 0.15 0.15" 
                    rotation="0 0 0"
                    animation-mixer
                ></a-entity>
                
                <!-- 🐦 CROW MODEL (from models/animated_crow/scene.gltf) -->
                <a-entity 
                    id="crow-model" 
                    gltf-model="url(models/animated_crow/scene.gltf)" 
                    scale="0.5 0.5 0.5" 
                    rotation="0 0 0"
                    animation-mixer
                ></a-entity>
                
                <!-- 💎 CRYSTAL MODEL (procedural) -->
                <a-entity id="crystal-model" visible="false">
                    <a-box position="0 0.5 0" scale="0.3 0.3 0.3" material="color: #00ffaa; shader: flat;"></a-box>
                    <a-torus-knot position="0 0.3 0" scale="0.2 0.2 0.2" material="color: #00c8ff; wireframe: true;"></a-torus-knot>
                </a-entity>
                
                <!-- 🌞 SOLAR SYSTEM MODEL (procedural) -->
                <a-entity id="solar-model" visible="false">
                    <a-sphere position="0 0.5 0" scale="0.15 0.15 0.15" material="color: #ffaa00;"></a-sphere>
                    <a-torus position="0 0.5 0" scale="0.3 0.3 0.3" rotation="90 0 0" material="color: #ffffff; transparent: true; opacity: 0.2;"></a-torus>
                    <a-torus position="0 0.5 0" scale="0.4 0.4 0.4" rotation="90 0 0" material="color: #ffffff; transparent: true; opacity: 0.1;"></a-torus>
                </a-entity>
                
                <!-- 🚀 ROCKET MODEL (procedural) -->
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

        setupPlacement(scene);
        setupModelSwitching();

        return scene;
    }

    // ==========================================
    // TAP TO PLACE
    // ==========================================
    function setupPlacement(scene) {
        const container = document.getElementById('model-container');
        if (!container) return;

        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        let isPlaced = false;

        const placeModel = function(event) {
            const camera = document.querySelector('a-entity[camera]');
            if (!camera) return;

            const pos = camera.object3D.position.clone();
            const dir = new THREE.Vector3(0, 0, -1);
            dir.applyQuaternion(camera.object3D.quaternion);
            
            const distance = 1.0;
            const targetPos = pos.clone().add(dir.multiplyScalar(distance));
            targetPos.y = -0.2;

            container.setAttribute('position', targetPos);
            container.setAttribute('visible', 'true');
            
            if (!isPlaced) {
                isPlaced = true;
                scanHint.classList.add('hidden');
                showToast('Model placed! Tap again to move', 1500);
            } else {
                showToast('Model moved!', 1000);
            }
        };

        canvas.addEventListener('click', placeModel);
        canvas.addEventListener('touchstart', function(event) {
            event.preventDefault();
            const touch = event.touches[0];
            if (!touch) return;
            
            const clickEvent = new MouseEvent('click', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(clickEvent);
        }, { passive: false });
    }

    // ==========================================
    // MODEL SWITCHING (UPDATED WITH CROW)
    // ==========================================
    function setupModelSwitching() {
        const models = {
            car: 'car-model',
            crow: 'crow-model',
            crystal: 'crystal-model',
            solar: 'solar-model',
            rocket: 'rocket-model'
        };

        let currentModel = 'car';

        modelBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const modelKey = this.dataset.model;
                if (modelKey === currentModel) return;

                modelBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const modelIds = Object.values(models);
                modelIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.setAttribute('visible', id === models[modelKey]);
                    }
                });

                currentModel = modelKey;
                showToast('Switched to ' + modelKey.charAt(0).toUpperCase() + modelKey.slice(1));
            });
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
            if (location.protocol !== 'https:' && 
                !['localhost', '127.0.0.1', ''].includes(location.hostname)) {
                throw new Error('HTTPS required. Please use a secure connection.');
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported.');
            }

            loadingText.textContent = 'Initializing AR...';
            const scene = createScene();

            loadingText.textContent = 'Starting AR engine...';
            await waitForAR(scene, 15000);

            isARActive = true;
            arLoading.classList.remove('active');
            landing.classList.add('hidden');
            arOverlay.classList.add('active');
            
            statusDot.classList.add('found');
            statusText.textContent = 'Tap to place';
            
            scanHint.classList.remove('hidden');

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

            setTimeout(() => {
                scanHint.classList.add('hidden');
            }, 5000);

            showToast('AR Ready! Tap screen to place model', 2000);
            console.log('[AR] Markerless AR ready!');
            console.log('[AR] Models available: car, crow, crystal, solar, rocket');

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
})();