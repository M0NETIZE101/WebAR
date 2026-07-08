import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export class ARManager {
    constructor(options = {}) {
        this.options = options;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.session = null;
        this.isRunning = false;
        this.models = [];
        this.qrPositions = new Map();
        
        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
    }
    
    setupRenderer() {
        const container = document.getElementById('ar-container');
        
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
        
        // Handle resize
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
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);
        
        // Directional light
        const directional = new THREE.DirectionalLight(0xffffff, 1.0);
        directional.position.set(0, 5, 5);
        directional.castShadow = true;
        this.scene.add(directional);
        
        // Fill light
        const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
        fill.position.set(-5, 0, 5);
        this.scene.add(fill);
        
        // Back light
        const back = new THREE.DirectionalLight(0xff8844, 0.2);
        back.position.set(0, 0, -5);
        this.scene.add(back);
        
        // Hemisphere light for better ambient
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.3);
        this.scene.add(hemi);
    }
    
    async checkSupport() {
        if (!navigator.xr) {
            console.warn('WebXR not supported');
            return false;
        }
        
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            return supported;
        } catch (error) {
            console.warn('Error checking WebXR support:', error);
            return false;
        }
    }
    
    async startARSession() {
        if (this.isRunning) return;
        
        try {
            // Create AR button and simulate click
            const arButton = ARButton.createButton(this.renderer, {
                requiredFeatures: ['hit-test', 'local-floor'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body },
                onSessionStarted: (session) => {
                    this.session = session;
                    this.isRunning = true;
                    
                    if (this.options.onSessionStarted) {
                        this.options.onSessionStarted();
                    }
                    
                    this.animate();
                },
                onSessionEnded: () => {
                    this.isRunning = false;
                    if (this.options.onSessionEnded) {
                        this.options.onSessionEnded();
                    }
                }
            });
            
            // Trigger click on AR button
            arButton.click();
            
        } catch (error) {
            console.error('Failed to start AR session:', error);
            if (this.options.onError) {
                this.options.onError(error);
            }
            throw error;
        }
    }
    
    addModelToScene(model) {
        if (model) {
            this.models.push(model);
            this.scene.add(model);
            
            // Initially hide model until QR detected
            model.visible = false;
        }
    }
    
    showModelAtQRPosition(model) {
        if (model) {
            model.visible = true;
            // Animate appearance
            model.scale.set(0, 0, 0);
            this.animateScale(model, 0, 1, 500);
        }
    }
    
    animateScale(object, from, to, duration) {
        const startTime = Date.now();
        
        const update = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
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
            // Update animations for all models
            this.models.forEach(model => {
                if (model.userData && model.userData.mixer) {
                    model.userData.mixer.update(0.016); // 60fps delta
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
    }
}