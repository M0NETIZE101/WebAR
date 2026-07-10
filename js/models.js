// ==========================================
// MODEL LOADING + SWITCHING + PLACEMENT
// ==========================================

import { hideLoading } from './ui.js';

let modelLoaded = false;
let isPlaced = false;

// ==========================================
// 🔥 FIXED: Listen to BOTH car and mecha
// ==========================================
export function setupModelEvents() {
    const models = document.querySelectorAll('#car-model, #mecha-model');
    if (!models.length) {
        console.warn('[AR] ⚠️ Model entities not found');
        hideLoading();
        return;
    }

    models.forEach(model => {
        model.addEventListener('model-loaded', () => {
            console.log('[AR] ✅ Model LOADED:', model.id);
            modelLoaded = true;
            hideLoading();
        });

        model.addEventListener('model-error', (event) => {
            console.warn('[AR] ❌ Model ERROR:', model.id, event.detail);
            hideLoading();
        });

        if (model.hasLoaded) {
            console.log('[AR] ✅ Model already loaded:', model.id);
            modelLoaded = true;
            hideLoading();
        }
    });
}

export function isModelLoaded() {
    return modelLoaded;
}

// ==========================================
// 🔥 FIXED: Quaternion → Euler rotation
// ==========================================
export function setupWorldAnchoring() {
    const marker = document.getElementById('ar-marker');
    const anchor = document.getElementById('world-anchor');

    if (!marker || !anchor) {
        console.warn('[AR] ⚠️ Marker or anchor not found');
        return;
    }

    marker.addEventListener('markerFound', () => {
        if (isPlaced) {
            console.log('[AR] Model already placed, ignoring marker');
            return;
        }

        console.log('[AR] 🔥 Marker detected — placing model ONCE');

        // Get marker's world position
        const pos = new THREE.Vector3();
        marker.object3D.getWorldPosition(pos);

        // Get marker's world rotation as quaternion
        const quat = new THREE.Quaternion();
        marker.object3D.getWorldQuaternion(quat);

        // 🔥 FIX: Convert quaternion to Euler angles
        const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');

        // Set anchor position and rotation (only Y-axis matters for ground placement)
        anchor.setAttribute('position', {
            x: pos.x,
            y: pos.y,
            z: pos.z
        });
        anchor.setAttribute('rotation', {
            x: 0,
            y: THREE.MathUtils.radToDeg(euler.y),
            z: 0
        });

        // 🔥 Also set the rotation of the anchor's children to match
        // This ensures the pedestal and models face the same direction
        const children = anchor.children;
        for (let i = 0; i < children.length; i++) {
            if (children[i].tagName === 'A-ENTITY') {
                children[i].setAttribute('rotation', {
                    x: 0,
                    y: THREE.MathUtils.radToDeg(euler.y),
                    z: 0
                });
            }
        }

        anchor.setAttribute('visible', 'true');
        isPlaced = true;

        // Hide marker prompt and loading
        document.getElementById('marker-prompt').classList.add('hidden');
        hideLoading();

        console.log('[AR] ✅ Model placed at:', pos);
        console.log('[AR] ✅ Model rotation (Y):', THREE.MathUtils.radToDeg(euler.y));
    });

    marker.addEventListener('markerLost', () => {
        console.log('[AR] Marker lost — model stays in place');
    });
}

// ==========================================
// MODEL SWITCHING — Car ↔ Mecha
// ==========================================

export function setupModelSwitching() {
    const buttons = document.querySelectorAll('.model-btn');
    const carModel = document.getElementById('car-model');
    const mechaModel = document.getElementById('mecha-model');

    if (!buttons.length || !carModel || !mechaModel) {
        console.warn('[AR] Model switching elements not found');
        return;
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const model = this.dataset.model;
            if (model === 'car') {
                carModel.setAttribute('visible', 'true');
                mechaModel.setAttribute('visible', 'false');
                console.log('[AR] 🔄 Switched to Car');
            } else if (model === 'mecha') {
                carModel.setAttribute('visible', 'false');
                mechaModel.setAttribute('visible', 'true');
                console.log('[AR] 🔄 Switched to Mecha');
            }
        });
    });
}