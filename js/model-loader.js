import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader.setDRACOLoader(this.dracoLoader);
        this.loadedModels = new Map();
        this.textureLoader = new THREE.TextureLoader();
    }
    
    async loadModel(path, options = {}) {
        try {
            console.log(`Loading model from: ${path}`);
            
            // If texture path is provided, set it for texture loading
            if (options.texturePath) {
                this.textureLoader.setPath(options.texturePath);
            }
            
            const gltf = await new Promise((resolve, reject) => {
                this.loader.load(path, resolve, undefined, reject);
            });
            
            const model = gltf.scene;
            
            // Apply options
            if (options.scale) {
                model.scale.set(options.scale, options.scale, options.scale);
            }
            
            if (options.position) {
                model.position.copy(options.position);
            }
            
            if (options.rotation) {
                model.rotation.copy(options.rotation);
            }
            
            // Setup animations
            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                const clips = gltf.animations;
                
                // Play first animation by default
                if (options.autoPlayAnimation !== false) {
                    const action = mixer.clipAction(clips[0]);
                    action.play();
                }
                
                // Store mixer for later updates
                model.userData.mixer = mixer;
                model.userData.clips = clips;
                model.userData.animations = gltf.animations;
            }
            
            // Process materials and textures
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    // Handle materials
                    if (node.material) {
                        const materials = Array.isArray(node.material) ? node.material : [node.material];
                        materials.forEach(mat => {
                            // Ensure textures are loaded with correct path
                            if (mat.map) {
                                // If texture path is provided, use it
                                if (options.texturePath) {
                                    const textureName = mat.map.name || mat.map.source?.data?.src || '';
                                    if (textureName) {
                                        const texturePath = options.texturePath + textureName;
                                        mat.map = this.textureLoader.load(texturePath);
                                    }
                                }
                                mat.map.encoding = THREE.sRGBEncoding;
                            }
                            if (mat.normalMap) {
                                mat.normalMap.encoding = THREE.LinearEncoding;
                            }
                            if (mat.roughnessMap) {
                                mat.roughnessMap.encoding = THREE.LinearEncoding;
                            }
                            if (mat.metalnessMap) {
                                mat.metalnessMap.encoding = THREE.LinearEncoding;
                            }
                            mat.envMapIntensity = 1.0;
                            mat.needsUpdate = true;
                        });
                    }
                }
            });
            
            // Store loaded model
            this.loadedModels.set(path, model);
            
            console.log('Model loaded successfully with textures');
            return model;
            
        } catch (error) {
            console.error('Error loading model:', error);
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }
    
    getLoadedModel(path) {
        return this.loadedModels.get(path) || null;
    }
    
    async loadMultipleModels(modelConfigs) {
        const promises = modelConfigs.map(config => 
            this.loadModel(config.path, config.options)
        );
        
        return Promise.all(promises);
    }
}