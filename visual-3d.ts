

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:organize-imports
// tslint:disable:ban-malformed-import-paths
// tslint:disable:no-new-decorators

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as sphereVS} from './sphere-shader';

/**
 * 3D live audio visual.
 */
@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private camera!: THREE.PerspectiveCamera;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);

  @property({attribute: false})
  inputData: Uint8Array | null = new Uint8Array(16);

  @property({attribute: false})
  outputData: Uint8Array | null = new Uint8Array(16);

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
      image-rendering: pixelated;
    }
  `;


  private async setupEnvironment(renderer: THREE.WebGLRenderer) {
    console.log('[DEBUG] Starting environment setup for liquid metal effect');
    const sphereMaterial = this.sphere.material as THREE.MeshStandardMaterial;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    try {
      console.log('[DEBUG] Attempting camera access for live reflection...');
      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBAFormat;

      // Use a render target to process video texture
      const renderTarget = pmremGenerator.fromEquirectangular(videoTexture);
      sphereMaterial.envMap = renderTarget.texture;
      console.log('[DEBUG] Live reflection enabled successfully');

    } catch (error) {
      console.error('[DEBUG] Camera permission denied or failed:', error);
      console.log('[DEBUG] Falling back to EXR environment map');
      
      try {
        const exrLoader = new EXRLoader();
        exrLoader.load(
          'public/piz_compressed.exr',
          (texture: THREE.DataTexture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            
            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            pmremGenerator.compileEquirectangularShader();
            const renderTarget = pmremGenerator.fromEquirectangular(texture);
            
            sphereMaterial.envMap = renderTarget.texture;
            sphereMaterial.needsUpdate = true;
            this.sphere.visible = true;
            
            pmremGenerator.dispose();
            console.log('[DEBUG] EXR environment map applied successfully');
          }
        );
      } catch (fallbackError) {
        console.error('[DEBUG] EXR fallback failed:', fallbackError);
        // Use a basic color as last resort
        sphereMaterial.envMap = null;
        sphereMaterial.emissive = new THREE.Color(0x555555);
      }
    } finally {
        pmremGenerator.dispose();
        sphereMaterial.needsUpdate = true;
        this.sphere.visible = true;
        console.log('[DEBUG] Sphere visibility set to true, material updated');
    }
  }

  private init() {
    console.log('[DEBUG] Initializing 3D liquid metal visualization');
    
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x100c14);
      console.log('[DEBUG] Scene created with background color');

      // Add robust lighting as a fallback
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5).normalize();
      scene.add(directionalLight);
      console.log('[DEBUG] Lighting setup complete');

      const backdrop = new THREE.Mesh(
        new THREE.IcosahedronGeometry(10, 5),
        new THREE.RawShaderMaterial({
          uniforms: {
            resolution: {value: new THREE.Vector2(1, 1)},
            rand: {value: 0},
          },
          vertexShader: backdropVS,
          fragmentShader: backdropFS,
          glslVersion: THREE.GLSL3,
        }),
      );
      backdrop.material.side = THREE.BackSide;
      scene.add(backdrop);
      this.backdrop = backdrop;
      console.log('[DEBUG] Backdrop mesh created');

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );
      camera.position.set(2, -2, 5);
      this.camera = camera;
      console.log('[DEBUG] Camera positioned');

      const renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
      });
      
      if (!renderer.context) {
        console.error('[DEBUG] WebGL context creation failed');
        throw new Error('WebGL not supported');
      }
      
      console.log('[DEBUG] WebGL renderer created successfully');
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      const geometry = new THREE.IcosahedronGeometry(1, 10);

      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0.05,
        emissive: 0x000000,
        emissiveIntensity: 1.5,
      });

      sphereMaterial.onBeforeCompile = (shader) => {
        console.log('[DEBUG] Compiling sphere shader');
        shader.uniforms.time = {value: 0};
        shader.uniforms.inputData = {value: new THREE.Vector4()};
        shader.uniforms.outputData = {value: new THREE.Vector4()};

        sphereMaterial.userData.shader = shader;

        shader.vertexShader = sphereVS;
      };

      const sphere = new THREE.Mesh(geometry, sphereMaterial);
      scene.add(sphere);
      sphere.visible = false; // Hide until texture is ready
      console.log('[DEBUG] Liquid metal sphere created, initially hidden');

      this.sphere = sphere;

      this.setupEnvironment(renderer);

      const renderPass = new RenderPass(scene, camera);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, // strength
        0.4, // radius
        0.85, // threshold
      );

      const composer = new EffectComposer(renderer);
      composer.addPass(renderPass);
      composer.addPass(bloomPass);

      this.composer = composer;
      console.log('[DEBUG] Effect composer setup complete');

      const onWindowResize = () => {
        console.log('[DEBUG] Window resize detected');
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        const dPR = renderer.getPixelRatio();
        const w = window.innerWidth;
        const h = window.innerHeight;
        (backdrop.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(w * dPR, h * dPR);
        renderer.setSize(w, h);
        composer.setSize(w, h);
      };

      window.addEventListener('resize', onWindowResize);
      onWindowResize();

      this.animation();
    } catch (error) {
      console.error('[DEBUG] 3D initialization failed:', error);
      // Fallback to basic canvas rendering
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#100c14';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('3D Rendering Failed', this.canvas.width / 2, this.canvas.height / 2);
      }
    }
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    if (!this.inputData || !this.outputData) return;

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;
    const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
    const sphereMaterial = this.sphere.material as THREE.MeshStandardMaterial;

    backdropMaterial.uniforms.rand.value = Math.random() * 10000;

    if (sphereMaterial.userData.shader) {
      this.sphere.scale.setScalar(1 + (0.2 * this.outputData[1]) / 255);

      const f = 0.001;
      this.rotation.x += (dt * f * 0.5 * this.outputData[1]) / 255;
      this.rotation.z += (dt * f * 0.5 * this.inputData[1]) / 255;
      this.rotation.y += (dt * f * 0.25 * this.inputData[2]) / 255;
      this.rotation.y += (dt * f * 0.25 * this.outputData[2]) / 255;

      const euler = new THREE.Euler(
        this.rotation.x,
        this.rotation.y,
        this.rotation.z,
      );
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const vector = new THREE.Vector3(0, 0, 5);
      vector.applyQuaternion(quaternion);
      this.camera.position.copy(vector);
      this.camera.lookAt(this.sphere.position);

      sphereMaterial.userData.shader.uniforms.time.value +=
        (dt * 0.1 * this.outputData[0]) / 255;
      sphereMaterial.userData.shader.uniforms.inputData.value.set(
        (1 * this.inputData[0]) / 255,
        (0.1 * this.inputData[1]) / 255,
        (10 * this.inputData[2]) / 255,
        0,
      );
      sphereMaterial.userData.shader.uniforms.outputData.value.set(
        (2 * this.outputData[0]) / 255,
        (0.1 * this.outputData[1]) / 255,
        (10 * this.outputData[2]) / 255,
        0,
      );
    }

    this.composer.render();
  }

  protected firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    this.init();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
}
