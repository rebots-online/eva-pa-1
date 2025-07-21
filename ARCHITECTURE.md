# Architectural Overview

This document provides a high-level overview of the application's architecture, including its key components and their interactions.

## Core Components

The application is a Chrome browser-based agentic personal assistant. It uses Lit for its UI components and Three.js for a dynamic visual effect that represents its status and activity.

*   **`GdmLiveAudio` (`index.tsx`)**: The main application component that manages the overall state, user interactions, and communication with the Chrome extension's background scripts. It serves as the container for the agent's interface.

*   **`GdmLiveAudioVisuals3D` (`visual-3d.ts`)**: A Lit component dedicated to rendering the 3D visual effect. It initializes the Three.js environment, including the camera, lighting, and the central "liquid metal" sphere. It also handles the animation loop, updating the visuals to reflect the assistant's state (e.g., listening, processing, speaking).

*   **Three.js Engine**: The core rendering library responsible for creating and displaying the 3D graphics. Key Three.js components used are:
    *   `EffectComposer`: Manages post-processing effects, such as the `UnrealBloomPass` which creates the glowing effect.
    *   `EXRLoader`: Used to load the `.exr` high-dynamic-range (HDR) image that serves as a fallback environment map for reflections when camera access is denied.
    *   `RenderPass`, `ShaderPass`: Core components for the rendering and effects pipeline.

*   **Chrome Extension APIs (`chrome.runtime`)**: Facilitates communication between the frontend components and the extension's background service for tasks like starting/stopping audio recording and managing application state.

## System Architecture Diagram

The diagram below illustrates the relationships between the major components of the system.

```mermaid
graph TD
    subgraph Chrome Extension
        A[index.tsx] --> B((chrome.runtime));
        B --> A;
    end

    subgraph UI Components
        A --> C[gdm-live-audio];
        C --> D[gdm-live-audio-visuals-3d];
    end

    subgraph 3D Rendering Engine (Three.js)
        D -- uses --> E[THREE.Scene];
        E -- contains --> F[THREE.Mesh (Sphere)];
        E -- contains --> G[THREE.Mesh (Backdrop)];
        D -- uses --> H[THREE.PerspectiveCamera];
        D -- uses --> I[EffectComposer];
        I -- contains --> J[RenderPass];
        I -- contains --> K[UnrealBloomPass];
        F -- material reflection --> L{Environment Map};
        subgraph EnvironmentSource
            M[Live Camera Feed] -- preferred --> L;
            N[EXRLoader/.exr file] -- fallback --> L;
        end
    end

    B -- sends audio data --> C;
    C -- passes audio data --> D;
    D -- updates shader uniforms with --> F;

    style A fill:#f9f,stroke:#333,stroke-width:2px;
    style C fill:#ccf,stroke:#333,stroke-width:2px;
    style D fill:#ccf,stroke:#333,stroke-width:2px;