import { AnimationData } from "../model/AnimationData";
import { MeshType, TextureType } from "./ModelViewParams";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TexturedOBJLoader } from "./TexturedOBJLoader";
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper';
import * as THREE from "three";
import Stats from 'stats.js';
import { IconSys } from "../model/IconSys";
import { Timeline } from "../utils/Animation";
import { ResolvedModelAssets } from "./ModelSource";

/**
 * Callback function for the model renderer report back regarding loaded icon data, e.g. number of frames.
 * @param frameCount The amount of frames the loaded icon has, 0 means no animation.
 * @param textureName The name of the loaded texture.
 */
export type IconInfoCallback = (frameCount: number, textureName: string | undefined) => void

const testMapTextureUrl = 'https://threejs.org/examples/textures/uv_grid_opengl.jpg';
const whiteTextureUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/70/Solid_white.svg';
const defaultIntensity = 5;

/**
 * Implementation of the 3D model view and interactions in threejs.
 * Used by ModelView.tsx component.
 */
export class ModelRendererImpl {
    // Display properties here, defaults will be overriden by Icon.tsx.
    public prop_animate: boolean = true;
    public prop_animationSpeed: number = 1;
    public prop_animationLength: number = 0;
    public prop_frame: number = 0; // Which frame to display, if there is animation data and prop_animate is false.
    public prop_grid: boolean = true;
    public prop_textureType: TextureType = TextureType.Icon;
    public prop_meshType: MeshType = MeshType.Mesh;
    
    /**
     * A callback for the model renderer to use to inform about the icon's status.
     */
    public prop_callback: IconInfoCallback = () => {};

    private iconcode: string | undefined;
    private iconsys : IconSys | undefined;

    // Store the last props set, to skip loading things already loaded.
    private last_iconcode: string | undefined;
    private last_variant: string | undefined;
    private last_textureType: TextureType = TextureType.Plain;

    /**
    When an obj file is loaded, this is the relative url of the texture found inside the mtllib.
    This is saved here so that when we wish to change only the texture, we have this without having to load the obj again. */
    private relativeMtlTextureUrl: string | undefined;

    /** Pending texture blob URL to apply after model loads (for file-based loading). */
    private pendingTextureBlobUrl: string | undefined;

    private clock = new THREE.Clock(true);

    // Scene items.
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private stats: Stats | undefined;
    private axesHelper: THREE.AxesHelper;
    private horizontalGridHelper: THREE.GridHelper;
    private vertexNormalHelper: VertexNormalsHelper | undefined = undefined;
    private directionalLights: THREE.DirectionalLight[] = Array(3);
    private ambientLight: THREE.AmbientLight;

    private initialised: boolean = false;
    private renderer: THREE.WebGLRenderer | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private controls: OrbitControls | undefined;

    // Bound event handlers (stored so they can be removed)
    private boundOnWindowResize: () => void;
    private boundOnCanvasClick: ((e: MouseEvent) => void) | undefined;
    private boundOnCanvasTouchStart: ((e: TouchEvent) => void) | undefined;

    private icon: THREE.Group | undefined;
    private pivot: THREE.Group | undefined;
    private geometry: THREE.BufferGeometry | undefined;
    private texture: THREE.Texture | undefined;
    private animData: AnimationData | undefined;
    private mesh: THREE.Mesh<any, any> | undefined;

    private timelines: Timeline[] = [];

    static readonly secondsPerAnimationFrame = 0.15;

    constructor() {
        console.log(`ModelRendererImpl constructor.`);
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 2000);
        this.scene.add(this.camera);
        this.reposition(undefined);

        this.axesHelper = new THREE.AxesHelper(0.5);
        this.scene.add(this.axesHelper);

        this.horizontalGridHelper = new THREE.GridHelper(1, 3);
        this.scene.add(this.horizontalGridHelper);

        for (let i = 0; i < 3; i++) {
            const light = new THREE.DirectionalLight(undefined, defaultIntensity);
            this.scene.add(light);
            this.directionalLights[i] = light;
        }

        this.ambientLight = new THREE.AmbientLight(undefined, defaultIntensity);
        this.scene.add(this.ambientLight);

        if (process.env.NODE_ENV === 'development') {
            this.stats = this.createStats();
        }

        // Bind event handlers so they can be added and removed
        this.boundOnWindowResize = this.onWindowResize.bind(this);
        this.assetLoadComplete = this.assetLoadComplete.bind(this);
        this.dispose = this.dispose.bind(this);
        this.animate = this.animate.bind(this);

        window.addEventListener('resize', this.boundOnWindowResize);
        this.animate();
    }

    /**
     * Initialisation that requires access to the DOM elements that cannot be done in constructor.
     */
    public initialise() {
        console.log(`ModelRendererImpl init. Init value: ${this.initialised}.`);

        if (this.initialised) {
            return;
        }

        this.canvas = document.querySelector('#iconRenderCanvas') as HTMLCanvasElement;
        if (this.stats) {
            this.canvas.before(this.stats.dom);
        }

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            logarithmicDepthBuffer: true,   // Fixes z-fighting texture flickering on icons, especially when icon is zoomed out a lot.
            alpha: true,    // Render the background transparent so we can display background colors (incl gradients) with CSS.
        });
        this.onWindowResize();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = -3;
        this.controls.rotateSpeed = 0.2;
        this.controls.update();

        // Create and store bound event handlers so they can be removed on dispose
        this.boundOnCanvasClick = () => {
            this.controls!.autoRotate = false;
            this.controls!.rotateSpeed = 0.2;  // Speed for mice.
        };
        this.boundOnCanvasTouchStart = () => {
            this.controls!.autoRotate = false;
            this.controls!.rotateSpeed = 0.4;   // Speed for touch screens.
        };
        this.canvas.addEventListener('click', this.boundOnCanvasClick);
        this.canvas.addEventListener('touchstart', this.boundOnCanvasTouchStart);

        this.last_iconcode = undefined;
        this.last_variant = undefined;
        this.last_textureType = TextureType.Icon;

        this.initialised = true;
    }

    public loadNewIcon(
        iconcode: string,
        iconsys: IconSys
    ) {
        console.log(`loadNewIcon: ${iconcode}.`);

        this.iconcode = iconcode;
        this.iconsys = iconsys;

        if (iconsys.ambiLightCol) {
            this.ambientLight.color = this.color(iconsys.ambiLightCol);
            
            this.directionalLights[0].color = this.color(iconsys.light1Col!);
            this.directionalLights[1].color = this.color(iconsys.light2Col!);
            this.directionalLights[2].color = this.color(iconsys.light3Col!);
            
            this.directionalLights[0].intensity = defaultIntensity;
            this.directionalLights[1].intensity = defaultIntensity;
            this.directionalLights[2].intensity = defaultIntensity;

            this.directionalLights[0].position.copy(this.v3(iconsys.light1Dir!));
            this.directionalLights[1].position.copy(this.v3(iconsys.light2Dir!));
            this.directionalLights[2].position.copy(this.v3(iconsys.light3Dir!));
        }
        else {
            this.ambientLight.color = new THREE.Color(1, 1, 1);
            
            this.directionalLights[0].intensity = 0;
            this.directionalLights[1].intensity = 0;
            this.directionalLights[2].intensity = 0;
        }
    }

    public loadVariant(
        variant: string,
        textureType: TextureType
    ) {
        if (!this.iconcode || !this.iconsys) {
            throw new Error('Cannot load variant while iconcode/iconsys is undefined.');
        }

        console.log(`ModelRendererImpl loadVariant. variant: ${variant}, textureType: ${textureType}.`);
        let loadNewModel = this.iconcode != this.last_iconcode || this.last_variant !== variant;
        let loadNewTexture = this.last_textureType !== textureType;
        let requireReposition = loadNewModel;
        const loadingManager = new THREE.LoadingManager(() => this.assetLoadComplete(requireReposition));

        // Load model & texture.
        let textureUrl =
            textureType === TextureType.Icon ? undefined :  // Load texture defined in mtl referenced by obj.
            textureType === TextureType.Test ? testMapTextureUrl :
            textureType === TextureType.Plain ? whiteTextureUrl :
            (() => { throw new Error("Unknown TextureType"); })();

        if (loadNewModel) {
            // Clear existing model and helpers
            this.clearScene();
            this.loadModel(loadingManager, this.iconcode, variant, textureUrl);
            this.loadAnimation(this.iconcode, variant);  // Don't await, let it work in the background.
        }
        else if (loadNewTexture) {  // Not changing model, only changing texture.
            this.loadTexture(loadingManager, textureUrl); // Don't await, let it work in the background.
        }

        this.last_iconcode = this.iconcode;
        this.last_variant = variant;
        this.last_textureType = textureType;
    }

    private loadModel(loadingManager: THREE.LoadingManager, iconcode: string, variant: string, textureUrl: string | undefined) {
        const objLoader = new TexturedOBJLoader(loadingManager);
        objLoader.loadV2(
            `/icons/${iconcode}/${variant}.obj`,
            textureUrl,
            this.loadProgress,
            (str) => { 
                this.relativeMtlTextureUrl = str;
                this.fireCallback();
            },
            this.loadError,
            (obj) => { this.icon = obj; }
        );
    }

    private async loadAnimation(iconcode: string, variant: string) {
        // Unload existing animData so it is not erroneously applied to a different model.
        this.animData = undefined;
        // Fetch animation data (if request doesn't succeed assume there is no animation).
        let animResponse = await fetch(`/icons/${iconcode}/${variant}.anim`);
        if (animResponse.ok) {
            let animText = await animResponse.text();

            if (animText.startsWith('{')) {
                let animJson = JSON.parse(animText) as AnimationData;
                this.animData = animJson;

                this.prop_animationLength = animJson.frameLength / 60;
                this.timelines = this.animData.frames.map((frame, idx) => {
                    let keys = frame.keys;
                    if (idx == 0) {
                        if (keys[0].time > 0) {
                            keys.unshift({ time: 0, value: 1 });
                        }
                    }
                    return new Timeline(keys)
                });
            }
            else {
                let preview = animText.substring(0, 50).replaceAll('\n', '');
                let dots = animText.length > 50 ? '...' : '';
                console.warn(`Animation data request response did appear to be JSON. Preview: ${preview}${dots}`);
            }
        }
        else {
            console.warn(`Request for animation data failed with status ${animResponse.status}`);
        }

        this.fireCallback();
    }

    private async loadTexture(loadingManager: THREE.LoadingManager, textureUrl: string | undefined) {
        const textureLoader = new THREE.TextureLoader(loadingManager);
        let url = textureUrl ?? this.relativeMtlTextureUrl?.replace('.mtl', '.png') ?? 'https://upload.wikimedia.org/wikipedia/commons/7/70/Solid_white.svg';
        let texture = await textureLoader.loadAsync(url);
        if (this.mesh) {
            let material = new THREE.MeshPhongMaterial();
            material.map = texture;
            material.map.colorSpace = THREE.SRGBColorSpace; // Must set this or else the texture looks washed out.
            this.mesh.material = material;
        }
    }

    loadProgress(_e: ProgressEvent) {
        // TODO: Maybe display download progress for model + texture.
    }

    loadError(e: any) {
        // Properties on `e` are `message` and `stack`.
        console.error(`Load error. Message: '${e.message}'`);
    }

    /**
     * Load a model from resolved assets (file-based loading).
     * This is an alternative to loadNewIcon + loadVariant for user-uploaded files.
     */
    public loadFromAssets(assets: ResolvedModelAssets) {
        console.log(`loadFromAssets: ${assets.currentVariant}`);

        // Apply lighting from iconSys if available
        this.applyIconSysLighting(assets.iconSys);

        // Clear previous model and helpers
        this.clearScene();
        this.timelines = [];

        // Store the texture blob URL to apply after model loads
        // We can't put blob URLs in the MTL file because MTLLoader's path resolution breaks them
        this.pendingTextureBlobUrl = assets.textureBlobUrl;

        // Load model from content
        const loadingManager = new THREE.LoadingManager(() => this.assetLoadComplete(true));
        this.loadModelFromContent(loadingManager, assets.objContent, assets.mtlBlobUrl);

        // Load animation if available
        if (assets.animContent) {
            this.parseAnimationContent(assets.animContent);
        }

        // Store texture info for callback
        this.relativeMtlTextureUrl = assets.textureFilename;
        this.fireCallback();
    }

    /**
     * Clear the current model and all associated helpers from the scene.
     * This is called internally when loading new models and externally for cleanup.
     */
    public clearScene() {
        // Remove the pivot (which contains the icon)
        if (this.pivot) {
            this.scene.remove(this.pivot);
            this.pivot = undefined;
        }

        // Remove vertex normal helper
        if (this.vertexNormalHelper) {
            this.scene.remove(this.vertexNormalHelper);
            this.vertexNormalHelper.dispose();
            this.vertexNormalHelper = undefined;
        }

        // Clear references
        this.icon = undefined;
        this.mesh = undefined;
        this.geometry = undefined;

        // Clear animation data
        this.animData = undefined;
        this.timelines = [];
    }

    /**
     * Apply lighting settings from IconSys.
     */
    private applyIconSysLighting(iconSys: IconSys | undefined) {
        if (iconSys?.ambiLightCol) {
            this.ambientLight.color = this.color(iconSys.ambiLightCol);

            this.directionalLights[0].color = this.color(iconSys.light1Col!);
            this.directionalLights[1].color = this.color(iconSys.light2Col!);
            this.directionalLights[2].color = this.color(iconSys.light3Col!);

            this.directionalLights[0].intensity = defaultIntensity;
            this.directionalLights[1].intensity = defaultIntensity;
            this.directionalLights[2].intensity = defaultIntensity;

            this.directionalLights[0].position.copy(this.v3(iconSys.light1Dir!));
            this.directionalLights[1].position.copy(this.v3(iconSys.light2Dir!));
            this.directionalLights[2].position.copy(this.v3(iconSys.light3Dir!));
        }
        else {
            this.ambientLight.color = new THREE.Color(1, 1, 1);

            this.directionalLights[0].intensity = 0;
            this.directionalLights[1].intensity = 0;
            this.directionalLights[2].intensity = 0;
        }
    }

    /**
     * Load model from OBJ content and MTL blob URL.
     */
    private loadModelFromContent(
        loadingManager: THREE.LoadingManager,
        objContent: string,
        mtlBlobUrl: string
    ) {
        const objLoader = new TexturedOBJLoader(loadingManager);
        objLoader.loadFromContent(
            objContent,
            mtlBlobUrl,
            (obj) => { this.icon = obj; },
            this.loadError
        );
    }

    /**
     * Parse animation content directly (for file-based loading).
     */
    private parseAnimationContent(animContent: string) {
        if (!animContent.startsWith('{')) {
            console.warn('Animation content does not appear to be JSON');
            return;
        }

        try {
            const animJson = JSON.parse(animContent) as AnimationData;
            this.animData = animJson;
            this.prop_animationLength = animJson.frameLength / 60;

            this.timelines = this.animData.frames.map((frame, idx) => {
                let keys = frame.keys;
                if (idx == 0) {
                    if (keys[0].time > 0) {
                        keys.unshift({ time: 0, value: 1 });
                    }
                }
                return new Timeline(keys);
            });
        } catch (e) {
            console.error('Failed to parse animation content:', e);
        }
    }

    /**
     * Adjust camera position, grid size, etc according to current model bounding box.
     * @param boundingBox Bounding box information of the current model.
     */
    reposition(boundingBox: THREE.Box3 | undefined) {
        let size = new THREE.Vector3();
        if (boundingBox) {
            boundingBox.getSize(size);
        }
        let maxAxes = Math.max(size.x, size.y, size.z);
        this.camera.position.z = Math.min(-maxAxes * 1.25, -2);
        this.camera.position.y = Math.max(size.x * 0.5, 0.75);
        this.camera.position.x = 0;
        
        let gridSize = Math.max(maxAxes, 1);    // Grid size is the size of the largest axes, minimum of 1.
        this.horizontalGridHelper?.scale.set(gridSize, gridSize, gridSize);
        this.horizontalGridHelper?.position.setY(-size.y / 2);
        this.axesHelper?.scale.set(gridSize, gridSize, gridSize);
        this.axesHelper?.position.setY(-size.y / 2);

        if (this.mesh) {
            this.vertexNormalHelper = new VertexNormalsHelper(this.mesh, 0.1);
            this.scene.add(this.vertexNormalHelper);
        }
    }

    // Ran when either obj or texture loading is complete.
    assetLoadComplete(reposition: boolean) {
        if (this.icon) {
            this.icon.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    this.mesh = child;
                    this.geometry = child.geometry;

                    // If the geometry has vertex color data enable display of them.
                    // If we enable without the data the model will appear black.
                    // Old contributions made with the first version of mymc++ have no vertex color data.
                    if (this.geometry!.attributes.color) {
                        this.mesh.material.vertexColors = true;
                    }
                }
            });

            // Apply pending texture if we have one (from file-based loading)
            if (this.pendingTextureBlobUrl && this.mesh) {
                this.applyTextureFromBlobUrl(this.pendingTextureBlobUrl);
                this.pendingTextureBlobUrl = undefined;
            }

            // Calculate bounding box and "center" of icon.
            let boundingBox = new THREE.Box3().setFromObject(this.icon)
            let center = new THREE.Vector3();
            boundingBox.getCenter(center);  // Weird library design, rather than use the return value, copies the result into the parameter.

            // Place icon on pivot at center so rotation feels natural.
            this.pivot = new THREE.Group();
            this.icon.position.sub(center);
            this.pivot.add(this.icon);
            this.scene.add(this.pivot);

            if (reposition) {
                this.reposition(boundingBox);
            }
        }
    }

    /**
     * Apply a texture from a blob URL to the current mesh.
     */
    private async applyTextureFromBlobUrl(blobUrl: string) {
        if (!this.mesh) return;

        const textureLoader = new THREE.TextureLoader();
        try {
            const texture = await textureLoader.loadAsync(blobUrl);
            const material = new THREE.MeshPhongMaterial();
            material.map = texture;
            material.map.colorSpace = THREE.SRGBColorSpace;

            // Preserve vertex colors if the geometry has them
            if (this.geometry?.attributes.color) {
                material.vertexColors = true;
            }

            this.mesh.material = material;
        } catch (e) {
            console.error('Failed to load texture from blob URL:', e);
        }
    }

    /** Fire prop_callback with the appropriate data. */
    private fireCallback() {
        this.prop_callback(
            this.animData?.frames?.length ?? 0,
            this.removePathAndExtension(this.relativeMtlTextureUrl)
        );
    }

    createStats(): Stats {
        var stats = new Stats();
        stats.dom.style.position = 'fixed';
        stats.dom.style.top = '0px';
        stats.dom.style.right = '0px';
        stats.dom.style.bottom = '';
        stats.dom.style.left = '';
        return stats;
    }

    public dispose() {
        console.log('ModelRendererImpl dispose.');

        // Clear the current model and helpers from the scene
        this.clearScene();

        // Dispose texture
        this.texture?.dispose();
        this.texture = undefined;

        // Reset tracking variables so next load starts fresh
        this.iconcode = undefined;
        this.iconsys = undefined;
        this.last_iconcode = undefined;
        this.last_variant = undefined;
        this.last_textureType = TextureType.Plain;
        this.relativeMtlTextureUrl = undefined;
        this.pendingTextureBlobUrl = undefined;

        // Remove canvas event listeners before disposing
        if (this.canvas) {
            if (this.boundOnCanvasClick) {
                this.canvas.removeEventListener('click', this.boundOnCanvasClick);
                this.boundOnCanvasClick = undefined;
            }
            if (this.boundOnCanvasTouchStart) {
                this.canvas.removeEventListener('touchstart', this.boundOnCanvasTouchStart);
                this.boundOnCanvasTouchStart = undefined;
            }
        }

        // Dispose controls
        this.controls?.dispose();
        this.controls = undefined;

        // Remove stats from DOM if present
        if (this.stats) {
            this.stats.dom.remove();
        }

        // Dispose WebGL renderer (this releases GPU resources)
        this.renderer?.dispose();
        this.renderer = undefined;
        this.canvas = undefined;

        this.initialised = false;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        if (this.renderer) {
            this.renderer.setDrawingBufferSize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
        }
    }

    public animate() {
        const delta = this.clock.getDelta();
        this.controls?.update(delta);
        this.stats?.update();
        this.render();
        requestAnimationFrame(this.animate);
    }

    render() {
        this.axesHelper.visible = this.prop_grid;
        this.horizontalGridHelper.visible = this.prop_grid;

        if (this.mesh) {
            this.mesh.material.wireframe = this.prop_meshType === MeshType.Wireframe;
            if (this.vertexNormalHelper) {
                this.vertexNormalHelper.visible = this.prop_meshType === MeshType.Normals;
            }
            this.mesh.visible = this.prop_meshType !== MeshType.Normals;
        }

        // TODO: There's better ways to do this animationSpeed alteration, but that can come with the keyframing refactor eventually.
        const elapsedTime = this.clock.getElapsedTime() * this.prop_animationSpeed;
        if (this.animData && this.geometry) {
            const timeInCycle = elapsedTime % this.prop_animationLength;
            const frame = Math.floor(timeInCycle * 60);


            const positionAttribute = this.geometry.attributes.position;
            const updatedPositions = new Float32Array(positionAttribute.count * 3);

            let sum = 0;
            let weights = [];

            for (const timeline of this.timelines) {
                let y = timeline.evaluate(frame);
                sum += y;
                weights.push(y);
            }

            for (let j = 0; j < this.animData.frames.length; j++) {
                const frame = this.animData.frames[j];
                const normalizedWeight = weights[j] / sum;

                for (let i = 0; i < frame.vertexData.length; i++) {
                    const [x, y, z] = frame.vertexData.slice(i * 3, (i * 3) + 3);

                    updatedPositions[i * 3 + 0] += -x * normalizedWeight;
                    updatedPositions[i * 3 + 1] += -y * normalizedWeight;
                    updatedPositions[i * 3 + 2] += z * normalizedWeight;
                }
            }

            this.geometry.setAttribute('position', new THREE.BufferAttribute(updatedPositions, 3));
        }

        if (this.vertexNormalHelper?.visible) {
            this.vertexNormalHelper.update();
        }

        this.renderer?.render(this.scene, this.camera);
    }

    /*function getNextStep(current: number, max: number, step: number) {
        const steps = Array.from({ length: (max / step) }, (_, i) => (i + 1) * step);
        let next = steps.find((s) => s > current);
        if (!next)
        {
            next = step;
        }
        return next;
    }*/

    clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(value, max));
    }

    lerp(start: number, end: number, t: number) {
        return start * (1 - t) + end * t;
    }

    wrappedIndex<T>(array: T[], index: number): T {
        return array[index % array.length];
    }

    /** Turn string 'test/bababooey/tet.ico.mtl' into 'tet.ico'. */
    removePathAndExtension(input: string | undefined): string | undefined {
        if (!input) {
            return input;
        }

        // Match everything after the last slash and before the last dot
        const regex = /[^\/]+(?=\.[^.]*$)/;
        const match = input.match(regex);
        return match ? match[0] : input;
    }

    v3(numbers: number[]) {
        return new THREE.Vector3(numbers[0], numbers[1], numbers[2]);
    }

    color(numbers: number[]) {
        return new THREE.Color().setRGB(numbers[0], numbers[1], numbers[2]);
    }
}