// ==========================================
// MAIN APP — ORCHESTRATOR
// ==========================================

import { showLoading, hideLoading, showError, showMarkerPrompt, hideMarkerPrompt } from './ui.js';
import { forceFullscreenLayers, resetLayers } from './layers.js';
import { checkRequirements, requestCameraPermission, initializeARJS } from './ar-init.js';
import { setupMarkerEvents, isMarkerDetected, resetMarkerState } from './markers.js';
import { setupModelEvents, isModelLoaded, resetModelState, setupModelSwitching } from './models.js';
// 🔥 REMOVED: import { setupDebug } from './debug.js';

// ==========================================
// STATE
// ==========================================
let isARStarted = false;

// ==========================================
// MAIN START FUNCTION
// ==========================================
async function startAR() {
    if (isARStarted) return;

    const startBtn = document.getElementById('start-btn');
    const overlay = document.getElementById('permission-overlay');
    const scene = document.getElementById('ar-scene');

    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    console.log('[AR] 🚀 Starting AR...');

    try {
        showLoading('Checking device...');
        checkRequirements();

        await requestCameraPermission();

        overlay.classList.add('hidden');

        await initializeARJS(scene);

        // Force layers ONCE after AR starts
        setTimeout(forceFullscreenLayers, 500);

        setupMarkerEvents();
        setupModelEvents();
        setupModelSwitching();

        showMarkerPrompt();

        setTimeout(() => {
            if (!isModelLoaded() && !isMarkerDetected()) {
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
document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-btn');
    const reloadBtn = document.getElementById('reload-btn');

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
            if (isARStarted) {
                setTimeout(forceFullscreenLayers, 100);
            }
        }
    });

    // ==========================================
    // INITIAL STATE
    // ==========================================
    document.getElementById('permission-overlay').classList.remove('hidden');
    document.getElementById('error-screen').classList.remove('visible');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('marker-prompt').classList.add('hidden');

    console.log('[AR] 🚀 App initialized');
    console.log('[AR] 🔧 Run ARDebug.all() in console for diagnostics');
});

// ==========================================
// 🔍 SIMPLE DEBUG (without external file)
// ==========================================
window.ARDebug = {
    elements: function() {
        console.group('🔍 AR Elements Status');
        const checks = {
            'Scene': document.getElementById('ar-scene'),
            'Marker': document.getElementById('ar-marker'),
            'Car Model': document.getElementById('car-model'),
            'Mecha Model': document.getElementById('mecha-model'),
            'Video': document.querySelector('video'),
            'Canvas': document.querySelector('canvas'),
        };
        for (const [name, el] of Object.entries(checks)) {
            console.log(`${name}: ${el ? '✅ EXISTS' : '❌ MISSING'}`);
        }
        console.groupEnd();
    },
    layers: function() {
        const video = document.querySelector('video');
        const canvas = document.querySelector('canvas');
        console.log('Video z-index:', video?.style.zIndex);
        console.log('Canvas z-index:', canvas?.style.zIndex);
        console.log('Video size:', video?.style.width, video?.style.height);
        console.log('Canvas size:', canvas?.style.width, canvas?.style.height);
    },
    forceLayers: function() {
        forceFullscreenLayers();
    },
    all: function() {
        console.log('🔍 ===== AR DEBUG ALL =====');
        this.elements();
        this.layers();
        console.log('🔍 ===== END =====');
    }
};