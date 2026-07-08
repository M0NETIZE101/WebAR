import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export class ARManager {
    constructor(options = {}) {
        console.log('🔧 ARManager created');
        this.options = options;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.session = null;
        this.isRunning = false;
        this.models = [];
        this.arButton = null;
        
        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        
        console.log('✅ ARManager setup complete');
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
    }
    
    setupRenderer() {
        const container = document.getElementById('ar-container');
        if (!container) {
            console.error('❌ AR container not found!');
            return;
        }
        console.log('📦 AR container found');
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        container.appendChild(this.renderer.domElement);
        console.log('✅ Renderer added to DOM');
        
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 0);
        this.scene.add(this.camera);
    }
    
    setupLights() {
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(0, 5, 5);
        directional.castShadow = true;
        this.scene.add(directional);
        
        const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
        fill.position.set(-5, 0, 5);
        this.scene.add(fill);
        
        const back = new THREE.DirectionalLight(0xff8844, 0.2);
        back.position.set(0, 0, -5);
        this.scene.add(back);
        
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.3);
        this.scene.add(hemi);
        
        console.log('✅ Lights setup complete');
    }
    
    async checkSupport() {
        console.log('🔍 Checking WebXR support...');
        if (!navigator.xr) {
            console.warn('❌ WebXR not supported');
            return false;
        }
        
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            console.log(`✅ WebXR immersive-ar supported: ${supported}`);
            return supported;
        } catch (error) {
            console.warn('❌ Error checking WebXR support:', error);
            return false;
        }
    }
    
    async startARSession() {
        console.log('🚀 Starting AR session...');
        if (this.isRunning) {
            console.log('⚠️ AR already running');
            return;
        }
        
        try {
            // Show a message that we're trying to start
            this.showStatus('📷 Requesting camera access...', '');
            
            // Create AR button
            this.arButton = ARButton.createButton(this.renderer, {
                requiredFeatures: ['hit-test', 'local-floor'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body },
                onSessionStarted: (session) => {
                    console.log('✅ AR Session Started!');
                    this.session = session;
                    this.isRunning = true;
                    this.showStatus('✅ Camera active! Scanning for QR...', 'success');
                    
                    if (this.options.onSessionStarted) {
                        this.options.onSessionStarted();
                    }
                    
                    this.animate();
                },
                onSessionEnded: () => {
                    console.log('⏹️ AR Session Ended');
                    this.isRunning = false;
                    this.showStatus('AR session ended', '');
                    if (this.options.onSessionEnded) {
                        this.options.onSessionEnded();
                    }
                },
                onError: (error) => {
                    console.error('❌ AR Error:', error);
                    this.showStatus('❌ AR Error: ' + error.message, 'error');
                    if (this.options.onError) {
                        this.options.onError(error);
                    }
                }
            });
            
            // Add the button to the DOM (it's hidden but will trigger the AR request)
            document.body.appendChild(this.arButton);
            
            // Click the button programmatically
            console.log('🖱️ Clicking AR button...');
            this.arButton.click();
            console.log('✅ AR button clicked');
            
            // Show a status that we're waiting for permission
            this.showStatus('⏳ Waiting for camera permission...', '');
            
            // Hide the button after click
            setTimeout(() => {
                if (this.arButton) {
                    this.arButton.style.display = 'none';
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to start AR session:', error);
            this.showStatus('❌ Failed: ' + error.message, 'error');
            if (this.options.onError) {
                this.options.onError(error);
            }
            throw error;
        }
    }
    
    showStatus(message, type = '') {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'visible ' + type;
        }
        console.log('📱 Status:', message);
    }
    
    addModelToScene(model) {
        if (model) {
            this.models.push(model);
            this.scene.add(model);
            model.visible = false;
            console.log('✅ Model added to scene (hidden)');
        }
    }
    
    showModelAtQRPosition(model) {
        if (model) {
            model.visible = true;
            model.scale.set(0, 0, 0);
            this.animateScale(model, 0, 1, 500);
            console.log('✅ Model shown with animation');
        }
    }
    
    animateScale(object, from, to, duration) {
        const startTime = Date.now();
        
        const update = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const scale = from + (to - from) * eased;
            
            object.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        update();
    }
    
    hideModel(model) {
        if (model) {
            model.visible = false;
        }
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.renderer.setAnimationLoop(() => {
            this.models.forEach(model => {
                if (model.userData && model.userData.mixer) {
                    model.userData.mixer.update(0.016);
                }
            });
            
            this.renderer.render(this.scene, this.camera);
        });
    }
    
    stop() {
        this.isRunning = false;
        this.renderer.setAnimationLoop(null);
        if (this.session) {
            this.session.end();
        }
        if (this.arButton) {
            this.arButton.remove();
        }
    }
}