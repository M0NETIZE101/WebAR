# 🚀 WebAR - Augmented Reality Experience

**Live Demo:** [https://m0netize101.github.io/WebAR/](https://m0netize101.github.io/WebAR/)

A dual-mode Augmented Reality (AR) web application that provides two distinct experiences: a reliable marker-based mode compatible with virtually any device, and an immersive 6DoF mode for ARCore/ARKit-enabled devices. Built with A-Frame and AR.js.

## ✨ Features

*   **Dual-Mode Architecture:** A user-friendly choice screen lets visitors select the best AR mode for their device.
*   **Marker-Based AR Mode (`arjs-mode.html`):**
    *   Uses a Hiro marker for tracking.
    *   The 3D model is anchored to and follows the physical marker.
    *   **Works on all devices** with a camera (desktop, mobile, no gyroscope required).
*   **WebXR 6DoF AR Mode (`webxr-mode.html`):**
    *   Uses WebXR for world-space tracking.
    *   The model is placed once in the real world and remains anchored, even after the marker is removed.
    *   **Requires ARCore (Android)** or **ARKit (iOS)** for full 6DoF tracking.
*   **Interactive 3D Models:**
    *   Switch between a **Car** (`model.glb`) and a **Mecha** (`mecha.glb`) with a walking animation.
    *   Both models are presented on a subtle pedestal for realistic grounding.
*   **Polished User Experience:**
    *   Clear camera permission overlay.
    *   Loading indicators and helpful on-screen prompts.
    *   Optimized for fullscreen on mobile devices.

## 🛠️ Tech Stack

*   **[A-Frame 1.4.0](https://aframe.io/):** Core 3D web framework.
*   **[AR.js](https://ar-js-org.github.io/AR.js-Docs/):** Marker-based AR tracking.
*   **[aframe-extras](https://github.com/n5ro/aframe-extras):** Used for the `animation-mixer` component to play GLTF animations.
*   **[WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API):** Enables the 6DoF AR mode.

## 📁 Project Structure
