# Change History

## v0.1.0 - Initial Implementation & Bug Fixes

This initial version of the agentic personal assistant includes the foundational 3D rendering for its dynamic visual interface and critical bug fixes.

### Key Developments:

*   **Initial Project Setup**: The project was initialized as a Chrome browser-based agentic personal assistant with a dynamic visual interface built using Three.js and Lit. The core components include `GdmLiveAudio` for managing application state and `GdmLiveAudioVisuals3D` for handling the 3D scene.
*   **Black Screen Issue**: A critical bug was identified where the application would render a black screen if camera permissions were denied. This was because the 3D sphere's reflection was dependent on the camera stream.
*   **`.exr` Fallback Implemented**: To resolve the black screen issue, a fallback mechanism was added. If camera access fails, the system now loads a pre-rendered `.exr` environment map to ensure the visualization is always active.