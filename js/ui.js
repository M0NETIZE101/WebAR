// ==========================================
// UI HELPERS
// ==========================================

export function showLoading(text) {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    loadingText.textContent = text || 'Loading AR...';
    loading.classList.remove('hidden');
}

export function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

export function showError(message) {
    const errorScreen = document.getElementById('error-screen');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message || 'An unknown error occurred.';
    errorScreen.classList.add('visible');
    document.getElementById('permission-overlay').classList.add('hidden');
    hideLoading();
}

export function showMarkerPrompt() {
    document.getElementById('marker-prompt').classList.remove('hidden');
}

export function hideMarkerPrompt() {
    document.getElementById('marker-prompt').classList.add('hidden');
}