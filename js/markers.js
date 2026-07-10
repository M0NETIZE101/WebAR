// ==========================================
// MARKER EVENTS
// ==========================================

import { hideMarkerPrompt, showMarkerPrompt, hideLoading } from './ui.js';

let markerDetected = false;

export function setupMarkerEvents() {
    const marker = document.getElementById('ar-marker');
    if (!marker) {
        console.warn('[AR] ⚠️ Marker element not found');
        return;
    }

    marker.addEventListener('markerFound', () => {
        console.log('[AR] ✅✅✅ MARKER FOUND ✅✅✅');
        markerDetected = true;
        hideMarkerPrompt();
        hideLoading();
    });

    marker.addEventListener('markerLost', () => {
        console.log('[AR] ❌❌❌ MARKER LOST ❌❌❌');
        markerDetected = false;
        // Model loaded check is handled in app.js
    });

    console.log('[AR] ✅ Marker events configured');
}

export function isMarkerDetected() {
    return markerDetected;
}

export function resetMarkerState() {
    markerDetected = false;
}