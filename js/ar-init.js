// ==========================================
// AR.JS INITIALIZATION
// ==========================================

import { showLoading, hideLoading, showError } from './ui.js';

export function checkRequirements() {
    console.log('[AR] Checking requirements...');

    if (location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1') {
        throw new Error('HTTPS required.\n\nPlease access this page via a secure connection (https://).');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported.\n\nPlease use a modern browser like Chrome or Firefox.');
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        throw new Error('WebGL not available.\n\nYour device or browser may not support 3D rendering.');
    }

    console.log('[AR] ✅ Requirements passed');
    return true;
}

export async function requestCameraPermission() {
    showLoading('Requesting camera access...');
    console.log('[AR] Requesting camera permission...');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        stream.getTracks().forEach(track => track.stop());
        console.log('[AR] ✅ Manual camera stream stopped');

        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('[AR] ✅ Camera release delay complete');

        return true;

    } catch (err) {
        console.error('[AR] ❌ Camera permission error:', err);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw new Error('Camera permission denied.\n\nPlease allow camera access in your browser settings and reload.');
        } else if (err.name === 'NotFoundError') {
            throw new Error('No camera found.\n\nPlease connect a camera and try again.');
        } else if (err.name === 'NotReadableError') {
            throw new Error('Camera is temporarily unavailable.\n\nPlease close other apps using the camera and reload.');
        } else {
            throw new Error('Camera error: ' + err.message);
        }
    }
}

export function initializeARJS(scene) {
    return new Promise((resolve, reject) => {
        showLoading('Initializing AR engine...');
        console.log('[AR] Initializing AR.js...');

        scene.setAttribute('arjs', [
            'sourceType: webcam',
            'debugUIEnabled: false',
            'detectionMode: mono_and_matrix',
            'matrixCodeType: 3x3',
            'trackingMethod: best'
        ].join('; '));

        const startTime = Date.now();
        const timeout = 15000;
        let lastReadyState = -1;

        function checkARSystem() {
            const arSystem = scene.systems && scene.systems['arjs'];
            const video = document.querySelector('video');

            if (video && video.readyState !== lastReadyState) {
                lastReadyState = video.readyState;
                console.log('[AR] Video readyState:', video.readyState,
                    'paused:', video.paused,
                    'width:', video.videoWidth);
            }

            // Success cases
            if (arSystem && video && video.readyState >= 2) {
                console.log('[AR] ✅ AR.js initialized, video streaming');
                resolve(arSystem);
                return;
            }

            if (arSystem && video && video.readyState >= 1 && (Date.now() - startTime) > 2000) {
                console.log('[AR] ✅ AR.js ready, video loading');
                resolve(arSystem);
                return;
            }

            if (arSystem && video && video.videoWidth > 0) {
                console.log('[AR] ✅ AR.js ready, video has width: ' + video.videoWidth);
                resolve(arSystem);
                return;
            }

            if (arSystem && video && (Date.now() - startTime) > 5000) {
                console.log('[AR] ⚠️ AR.js system exists with video, assuming ready');
                resolve(arSystem);
                return;
            }

            if (Date.now() - startTime > timeout) {
                const videoState = video ? 'readyState: ' + video.readyState + ', width: ' + video.videoWidth : 'NO VIDEO';
                console.error('[AR] ❌ Timeout - video state:', videoState);
                reject(new Error('AR initialization timed out.\n\nVideo state: ' + videoState));
                return;
            }

            setTimeout(checkARSystem, 100);
        }

        checkARSystem();
    });
}