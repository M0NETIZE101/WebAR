// ==========================================
// MODEL LOADING & SWITCHING
// ==========================================

import { hideLoading } from './ui.js';

let modelLoaded = false;

export function setupModelEvents() {
    const model = document.getElementById('model-entity') || document.querySelector('[id$="-model"]');
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

export function isModelLoaded() {
    return modelLoaded;
}

export function resetModelState() {
    modelLoaded = false;
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