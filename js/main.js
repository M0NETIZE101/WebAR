import * as THREE from 'three';
import { ARManager } from './ar-manager.js';
import { ModelLoader } from './model-loader.js';
import { QRTracker } from './qr-tracker.js';

class WebARApplication {
    constructor() {
        console.log('🚀 App starting...');
        this.debug('App initializing...');
        
        this.scene = new THREE.Scene();
        this.arManager = null;
        this.modelLoader = new ModelLoader();
        this.qrTracker = new QRTracker();
        this.models = [];
        this.modelMap = new Map();
        
        this.config = {
            modelPath: './models/dinosaur/Pteradactal.glb',
            texturePath: './models/dinosaur/textures/',
            markerPath: './markers/qr-dinosaur.png',
            modelScale: 0.5,
            modelPosition: new THREE.Vector3(0, 0, -0.5)
        };
        
        this.debug(`Config: ${JSON.stringify(this.config)}`);
        this.init();
    }
    
    debug(message) {
        console.log('🔍', message);
        const debugEl = document.getElementById('debug-info');
        if (debugEl) {
            debugEl.textContent = message;
        }
    }
    
    async init() {
        try {
            this.debug('Step 1: Setting up AR...');
            this.updateLoadingStatus('Setting up AR...');
            
            this.arManager = new ARManager({
                onSessionStarted: this.onARSessionStarted.bind(this),
                onSessionEnded: this.onARSessionEnded.bind(this),
                onError: this.onARError.bind(this)
            });
            
            this.debug('Step 2: Checking WebXR support...');
            
            const supported = await this.arManager.checkSupport();
            this.debug(`Step 3: WebXR supported: ${supported}`);
            
            if (!supported) {
                this.showError('WebXR not supported on this device');
                this.debug('❌ WebXR NOT supported!');
                return;
            }
            
            this.debug('Step 4: Loading Pteradactal model...');
            this.updateLoadingStatus('Loading Pteradactal model...');
            
            // Check if model file exists
            try {
                const response = await fetch(this.config.modelPath);
                if (!response.ok) {
                    throw new Error(`Model file not found (${response.status})`);
                }
                this.debug(`✅ Model file found: ${this.config.modelPath}`);
            } catch (error) {
                this.debug(`❌ Model file error: ${error.message}`);
                throw new Error(`Cannot find model file at ${this.config.modelPath}`);
            }
            
            const model = await this.modelLoader.loadModel(
                this.config.modelPath,
                {
                    scale: this.config.modelScale,
                    position: this.config.modelPosition,
                    autoPlayAnimation: true,
                    texturePath: this.config.texturePath
                }
            );
            
            this.debug('✅ Model loaded successfully!');
            
            this.modelMap.set('dinosaur', model);
            this.modelMap.set('Pteradactal', model);
            this.modelMap.set('pteradactal', model);
            
            this.debug('Step 5: Hiding loading screen...');
            this.hideLoadingScreen();
            this.showInstructions();
            
            this.debug('✅ App ready! Waiting for user to start AR.');
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.debug(`❌ ERROR: ${error.message}`);
            this.showError('Failed to initialize AR: ' + error.message);
        }
    }
    
    onARSessionStarted() {
        this.debug('✅ AR Session Started!');
        this.updateLoadingStatus('AR Active!');
        
        this.modelMap.forEach((model, markerId) => {
            if (model) {
                this.arManager.addModelToScene(model);
                this.showStatus(`🦕 Pteradactal is ready!`, 'success');
                this.debug(`✅ Model added to scene for: ${markerId}`);
            }
        });
        
        this.debug('Starting QR tracking...');
        this.qrTracker.startTracking((qrData) => {
            this.debug(`📱 QR Detected: ${qrData}`);
            this.handleQRDetection(qrData);
        });
    }
    
    onARSessionEnded() {
        this.debug('AR Session Ended');
        this.showStatus('AR session ended', '');
    }
    
    onARError(error) {
        console.error('AR Error:', error);
        this.debug(`❌ AR Error: ${error.message}`);
        this.showError(error.message);
    }
    
    handleQRDetection(qrData) {
        this.debug(`📱 QR Detected: ${qrData}`);
        console.log('QR Detected:', qrData);
        
        if (this.modelMap.has(qrData)) {
            const model = this.modelMap.get(qrData);
            if (model) {
                this.arManager.showModelAtQRPosition(model);
                this.showStatus(`🦕 Pteradactal detected!`, 'success');
                this.debug(`✅ Showing model for: ${qrData}`);
            }
        } else {
            this.debug(`⏳ New QR code: ${qrData} - loading model...`);
            this.showStatus(`New QR code: ${qrData} - loading model...`, '');
            this.loadModelForQR(qrData);
        }
    }
    
    async loadModelForQR(qrData) {
        const modelPaths = {
            'dinosaur': './models/dinosaur/Pteradactal.glb',
            'pteradactal': './models/dinosaur/Pteradactal.glb',
            'trex': './models/trex/trex.glb',
            'stegosaurus': './models/stegosaurus/stegosaurus.glb'
        };
        
        const path = modelPaths[qrData.toLowerCase()];
        if (!path) {
            this.debug(`❌ No model mapping for: ${qrData}`);
            this.showStatus(`❌ No model found for QR: ${qrData}`, 'error');
            return;
        }
        
        try {
            this.debug(`📥 Loading model from: ${path}`);
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
            this.debug(`✅ Model loaded for: ${qrData}`);
        } catch (error) {
            console.error('Failed to load model:', error);
            this.debug(`❌ Failed to load: ${error.message}`);
            this.showStatus(`❌ Failed to load model for ${qrData}`, 'error');
        }
    }
    
    updateLoadingStatus(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
        this.debug(`Status: ${text}`);
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
        this.debug('Showing instructions...');
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.display = 'flex';
            
            const startBtn = document.getElementById('start-ar-btn');
            startBtn.addEventListener('click', () => {
                this.debug('User clicked Start AR button');
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
            this.debug('Starting AR session...');
            this.updateLoadingStatus('Starting AR...');
            // Show loading screen again briefly
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'flex';
                loadingScreen.classList.remove('hidden');
            }
            await this.arManager.startARSession();
            // Hide loading after session starts
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 2000);
        } catch (error) {
            console.error('Failed to start AR:', error);
            this.debug(`❌ Failed to start AR: ${error.message}`);
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
        this.debug(`❌ ERROR: ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded');
    new WebARApplication();
});