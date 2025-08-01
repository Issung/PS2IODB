import { AnimationData } from "../model/AnimationData";
import { MeshType, TextureType } from "./ModelViewParams";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TexturedOBJLoader } from "./TexturedOBJLoader";
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper';
import * as THREE from "three";
import Stats from 'stats.js';
import { IconSys } from "../model/IconSys";

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

    private icon: THREE.Group | undefined;
    private pivot: THREE.Group | undefined;
    private geometry: THREE.BufferGeometry | undefined;
    private texture: THREE.Texture | undefined;
    private animData: AnimationData | undefined;
    private mesh: THREE.Mesh<any, any> | undefined;

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

        window.addEventListener('resize', (e) => this.onWindowResize());

        this.assetLoadComplete = this.assetLoadComplete.bind(this);
        this.dispose = this.dispose.bind(this);
        this.animate = this.animate.bind(this);
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

        this.canvas.addEventListener('click', (e) => { 
            this.controls!.autoRotate = false;
            this.controls!.rotateSpeed = 0.2;  // Speed for mice.
        });
        this.canvas.addEventListener('touchstart', (e) => { 
            this.controls!.autoRotate = false;
            this.controls!.rotateSpeed = 0.4;   // Speed for touch screens.
        });

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
            if (this.pivot) {   // Remove existing icon if there is one.
                this.scene.remove(this.pivot);
            }
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

    loadProgress(e: ProgressEvent) {
        // TODO: Maybe display download progress for model + texture.
    }

    loadError(e: any) {
        // Properties on `e` are `message` and `stack`.
        console.error(`Load error. Message: '${e.message}'`);
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
        this.animData = undefined;
        this.geometry?.dispose();
        this.texture?.dispose();
        this.renderer?.dispose();
        this.initialised = false;
        console.log('ModelRendererImpl dispose.');
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
            let animationTotalFrames = this.animData.frames.length;
            let secondsForWholeAnimation = ModelRendererImpl.secondsPerAnimationFrame * animationTotalFrames;
            let animationFrame = !this.prop_animate ? this.clamp(this.prop_frame, 0, animationTotalFrames) : Math.floor((elapsedTime % secondsForWholeAnimation) / ModelRendererImpl.secondsPerAnimationFrame);
            //console.log(`animationFrame: ${animationFrame}`);

            // Modify the positions of each vertex.
            const positionAttribute = this.geometry.attributes.position;
            const updatedPositions = new Float32Array(positionAttribute.count * 3);
            for (let i = 0; i < positionAttribute.count; i++) {
                let [x1, y1, z1] = this.wrappedIndex(this.animData.frames, animationFrame).vertexData.slice(i * 3, (i * 3) + 3);
                x1 = -x1; y1 = -y1;

                let [x2, y2, z2] = this.wrappedIndex(this.animData.frames, animationFrame + 1).vertexData.slice(i * 3, (i * 3) + 3);
                x2 = -x2; y2 = -y2;

                let interp = !this.prop_animate ? 0 : (elapsedTime % ModelRendererImpl.secondsPerAnimationFrame) / ModelRendererImpl.secondsPerAnimationFrame;
                updatedPositions[i * 3 + 0] = this.lerp(x1, x2, interp);
                updatedPositions[i * 3 + 1] = this.lerp(y1, y2, interp);
                updatedPositions[i * 3 + 2] = this.lerp(z1, z2, interp);
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