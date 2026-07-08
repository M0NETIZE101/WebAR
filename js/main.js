import * as THREE from 'three';
import { ARManager } from './ar-manager.js';
import { ModelLoader } from './model-loader.js';
import { QRTracker } from './qr-tracker.js';

class WebARApplication {
    constructor() {
        this.scene = new THREE.Scene();
        this.arManager = null;
        this.modelLoader = new ModelLoader();
        this.qrTracker = new QRTracker();
        this.models = [];
        this.modelMap = new Map(); // QR code ID -> Model
        
        // Configuration - UPDATED with texture folder
        this.config = {
            modelPath: './models/dinosaur/Pteradactal.glb',  // Relative path for GitHub Pages
            texturePath: './models/dinosaur/textures/',      // Texture folder path
            markerPath: './markers/qr-dinosaur.png',
            modelScale: 0.5,
            modelPosition: new THREE.Vector3(0, 0, -0.5)
        };
        
        this.init();
    }
    
    async init() {
        try {
            this.updateLoadingStatus('Setting up AR...');
            
            // Initialize AR Manager
            this.arManager = new ARManager({
                onSessionStarted: this.onARSessionStarted.bind(this),
                onSessionEnded: this.onARSessionEnded.bind(this),
                onError: this.onARError.bind(this)
            });
            
            // Check WebXR support
            if (!await this.arManager.checkSupport()) {
                this.showError('WebXR not supported on this device');
                return;
            }
            
            this.updateLoadingStatus('Loading Pteradactal model...');
            
            // Load the dinosaur model with texture path
            const model = await this.modelLoader.loadModel(
                this.config.modelPath,
                {
                    scale: this.config.modelScale,
                    position: this.config.modelPosition,
                    autoPlayAnimation: true,
                    texturePath: this.config.texturePath  // Pass texture path
                }
            );
            
            // Store model with QR marker ID
            this.modelMap.set('dinosaur', model);
            this.modelMap.set('Pteradactal', model);
            this.modelMap.set('pteradactal', model);
            
            // Hide loading screen and show instructions
            this.hideLoadingScreen();
            this.showInstructions();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize AR: ' + error.message);
        }
    }
    
    onARSessionStarted() {
        // Add all models to scene
        this.modelMap.forEach((model, markerId) => {
            if (model) {
                this.arManager.addModelToScene(model);
                this.showStatus(`🦕 Pteradactal is ready!`, 'success');
            }
        });
        
        // Start QR tracking
        this.qrTracker.startTracking((qrData) => {
            this.handleQRDetection(qrData);
        });
    }
    
    onARSessionEnded() {
        this.showStatus('AR session ended', '');
    }
    
    onARError(error) {
        console.error('AR Error:', error);
        this.showError(error.message);
    }
    
    handleQRDetection(qrData) {
        console.log('QR Detected:', qrData);
        
        // Check if we have a model for this QR code
        if (this.modelMap.has(qrData)) {
            const model = this.modelMap.get(qrData);
            if (model) {
                // Show the model at QR location
                this.arManager.showModelAtQRPosition(model);
                this.showStatus(`🦕 Pteradactal detected!`, 'success');
            }
        } else {
            // Future: Load model dynamically for new QR codes
            this.showStatus(`New QR code: ${qrData} - loading model...`, '');
            this.loadModelForQR(qrData);
        }
    }
    
    async loadModelForQR(qrData) {
        // Map QR codes to model files - EXTENSIBLE for multiple models
        const modelPaths = {
            'dinosaur': './models/dinosaur/Pteradactal.glb',
            'pteradactal': './models/dinosaur/Pteradactal.glb',
            'trex': './models/trex/trex.glb',        // Future model
            'stegosaurus': './models/stegosaurus/stegosaurus.glb' // Future model
        };
        
        const path = modelPaths[qrData.toLowerCase()];
        if (!path) {
            this.showStatus(`❌ No model found for QR: ${qrData}`, 'error');
            return;
        }
        
        try {
            const model = await this.modelLoader.loadModel(path, {
                scale: 0.5,
                position: new THREE.Vector3(0, 0, -0.5),
                autoPlayAnimation: true,
                texturePath: `./models/${qrData.toLowerCase()}/textures/`
            });
            
            this.modelMap.set(qrData, model);
            this.arManager.addModelToScene(model);
            this.arManager.showModelAtQRPosition(model);
            this.showStatus(`✅ Loaded ${qrData} model!`, 'success');
        } catch (error) {
            console.error('Failed to load model:', error);
            this.showStatus(`❌ Failed to load model for ${qrData}`, 'error');
        }
    }
    
    updateLoadingStatus(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 800);
        }
    }
    
    showInstructions() {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.display = 'flex';
            
            const startBtn = document.getElementById('start-ar-btn');
            startBtn.addEventListener('click', () => {
                this.startARExperience();
            });
        }
    }
    
    async startARExperience() {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
        
        try {
            this.updateLoadingStatus('Starting AR...');
            await this.arManager.startARSession();
        } catch (error) {
            console.error('Failed to start AR:', error);
            this.showError('Failed to start AR: ' + error.message);
        }
    }
    
    showStatus(message, type = '') {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'visible ' + type;
            clearTimeout(this.statusTimeout);
            this.statusTimeout = setTimeout(() => {
                statusEl.className = '';
            }, 3000);
        }
    }
    
    showError(message) {
        this.showStatus('❌ ' + message, 'error');
        console.error(message);
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WebARApplication();
});