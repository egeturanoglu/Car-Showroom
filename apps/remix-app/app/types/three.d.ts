/**
 * Temporary lightweight type declarations for the "three" module so you can
 * start coding without pulling the full official types. Replace/remove this
 * file once you are ready to rely on the real "three" types from the package.
 *
 * These declarations only include the minimal surface used in your app.
 */

declare module "three" {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    setScalar(scalar: number): this;
  }

  export class Box3 {
    min: Vector3;
    max: Vector3;
    setFromObject(object: Object3D): this;
    getCenter(target: Vector3): Vector3;
    getSize(target: Vector3): Vector3;
  }

  export class Object3D {
    position: Vector3;
    rotation: { x: number; y: number; z: number };
    scale: Vector3;
    traverse(callback: (child) => void): void;
    lookAt(x: number, y: number, z: number): void;
  }

  export class Scene extends Object3D {
    add(object: Object3D): void;
    remove(object: Object3D): void;
    environment?: any;
  }

  export class PerspectiveCamera extends Object3D {
    constructor(fov: number, aspect: number, near: number, far: number);
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export interface WebGLRendererParameters {
    antialias?: boolean;
    alpha?: boolean;
  }

  export class WebGLRenderer {
    constructor(params?: WebGLRendererParameters);
    domElement: HTMLCanvasElement;
    shadowMap: {
      enabled: boolean;
      type: any;
    };
    toneMapping: any;
    toneMappingExposure: number;
    outputColorSpace?: any;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setPixelRatio(value: number): void;
    setClearColor(color: number, alpha: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }

  export class PMREMGenerator {
    constructor(renderer: WebGLRenderer);
    fromScene(
      scene: Scene,
      sigma?: number,
      near?: number,
      far?: number,
    ): { texture: any };
    dispose(): void;
  }

  export const PCFSoftShadowMap: any;
  export const ACESFilmicToneMapping: any;
  export const SRGBColorSpace: any;
  export const sRGBEncoding: any;

  export class Material {
    dispose(): void;
  }

  export class MeshNormalMaterial extends Material {}

  export class MeshLambertMaterial extends Material {
    constructor(parameters?: { color?: number });
  }

  export class BoxGeometry {
    constructor(width?: number, height?: number, depth?: number);
    dispose(): void;
  }
  export class PlaneGeometry {
    constructor(width?: number, height?: number);
    dispose(): void;
  }

  export class PlaneGeometry {
    constructor(width?: number, height?: number);
    dispose(): void;
  }

  export class Mesh<TGeometry = any, TMaterial = any> extends Object3D {
    constructor(geometry: TGeometry, material: TMaterial);
    geometry: TGeometry;
    material: TMaterial;
    castShadow: boolean;
    receiveShadow: boolean;
  }

  export class AmbientLight extends Object3D {
    constructor(color?: number, intensity?: number);
  }

  export class DirectionalLight extends Object3D {
    constructor(color?: number, intensity?: number);
    castShadow: boolean;
  }

  export class HemisphereLight extends Object3D {
    constructor(skyColor?: number, groundColor?: number, intensity?: number);
  }
}

declare module "three/examples/jsm/environments/RoomEnvironment.js" {
  export class RoomEnvironment {}
}

declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  import { Object3D } from "three";

  export interface GLTF {
    scene: Object3D;
    scenes: Object3D[];
    cameras: any[];
    animations: any[];
  }

  export class GLTFLoader {
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
  }
}
