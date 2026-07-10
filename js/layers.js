// ==========================================
// 🔥 FULLSCREEN LAYER FIX
// ==========================================

let layersFixed = false;

export function forceFullscreenLayers() {
    if (layersFixed) return;

    const videos = document.querySelectorAll('video');
    const canvas = document.querySelector('canvas');
    const sceneEl = document.querySelector('a-scene');

    // Force body & html to fullscreen
    document.body.style.cssText =
        'margin:0!important;padding:0!important;' +
        'width:100vw!important;height:100vh!important;' +
        'overflow:hidden!important;position:fixed!important;' +
        'top:0!important;left:0!important;background:#000!important;' +
        'max-width:100vw!important;max-height:100vh!important;';

    document.documentElement.style.cssText =
        'margin:0!important;padding:0!important;' +
        'width:100vw!important;height:100vh!important;' +
        'overflow:hidden!important;background:#000!important;' +
        'max-width:100vw!important;max-height:100vh!important;';

    // Force all videos to fullscreen
    videos.forEach((video) => {
        if (!video._fixed) {
            video.style.cssText =
                'position:fixed!important;top:0!important;left:0!important;' +
                'width:100vw!important;height:100vh!important;' +
                'min-width:100vw!important;min-height:100vh!important;' +
                'max-width:100vw!important;max-height:100vh!important;' +
                'object-fit:cover!important;z-index:0!important;' +
                'pointer-events:none!important;background:#000!important;' +
                'margin:0!important;padding:0!important;border:none!important;' +
                'transform:none!important;transform-origin:0 0!important;clip:none!important;';
            video._fixed = true;
        }
    });

    // Force canvas
    if (canvas && !canvas._fixed) {
        canvas.style.cssText =
            'position:fixed!important;top:0!important;left:0!important;' +
            'width:100vw!important;height:100vh!important;' +
            'min-width:100vw!important;min-height:100vh!important;' +
            'max-width:100vw!important;max-height:100vh!important;' +
            'z-index:10!important;background:transparent!important;' +
            'pointer-events:auto!important;margin:0!important;padding:0!important;' +
            'border:none!important;transform:none!important;';
        canvas._fixed = true;
    }

    // Force scene
    if (sceneEl && !sceneEl._fixed) {
        sceneEl.style.cssText =
            'position:fixed!important;top:0!important;left:0!important;' +
            'width:100vw!important;height:100vh!important;' +
            'max-width:100vw!important;max-height:100vh!important;' +
            'z-index:1!important;background:transparent!important;' +
            'overflow:hidden!important;margin:0!important;padding:0!important;' +
            'border:none!important;';
        sceneEl._fixed = true;
    }

    layersFixed = true;
}

export function resetLayers() {
    layersFixed = false;
}