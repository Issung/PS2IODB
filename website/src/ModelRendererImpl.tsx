import * as THREE from "three";
import { AnimationData } from "./AnimationData";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { MeshType, TextureType } from "./ModelViewParams";
import { TexturedOBJLoader } from "./TexturedOBJLoader";

/**
 * Implementation of the 3D model view and interactions in threejs.
 * Used by ModelView.tsx component.
 */
class ModelRendererImpl {
    // Display properties here, defaults will be overriden by Icon.tsx.
    public prop_animate: boolean = true;
    public prop_grid: boolean = true;
    public prop_textureType: TextureType = TextureType.Icon;
    public prop_meshType: MeshType = MeshType.Mesh;
    public prop_backgroundColor: string = '#000000';

    private clock = new THREE.Clock(true);

    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private stats: Stats;
    private axesHelper: THREE.AxesHelper;
    private verticalGridHelper: THREE.GridHelper;
    private horizontalGridHelper: THREE.GridHelper;

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

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 2000);
        this.camera.position.z = -2;
        this.camera.position.y = 0.75;
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);

        this.axesHelper = new THREE.AxesHelper(0.5);
        this.scene.add(this.axesHelper);

        this.verticalGridHelper = new THREE.GridHelper(1, 3);
        this.verticalGridHelper.setRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(90), 0, 0));
        this.scene.add(this.verticalGridHelper);

        this.horizontalGridHelper = new THREE.GridHelper(1, 3);
        this.scene.add(this.horizontalGridHelper);

        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        this.camera.add(pointLight);

        this.stats = this.createStats();

        window.addEventListener('resize', (e) => this.onWindowResize());

        this.assetLoadComplete = this.assetLoadComplete.bind(this);
        this.dispose = this.dispose.bind(this);
        this.animate = this.animate.bind(this);
        this.animate();
    }

    public init() {
        console.log(`ModelRendererImpl init. Init value: ${this.initialised}.`);
        this.initialised = true;

        this.canvas = document.querySelector('#iconRenderCanvas') as HTMLCanvasElement;
        this.canvas.before(this.stats.dom);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.onWindowResize();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = -2;
        this.controls.rotateSpeed = 0.2;
        this.controls.update();

        this.canvas.addEventListener('click', (e) => { this.controls!.autoRotate = false; });
    }

    public async loadNewIcon(iconcode: string, variant: number, textureType: TextureType) {
        console.log(`ModelRendererImpl loadNewIcon. Code: ${iconcode}, Variant: ${variant}.`);

        // Remove existing icon if there is one.
        if (this.pivot)
        {
            this.scene.remove(this.pivot);
        }

        const loadingManager = new THREE.LoadingManager(this.assetLoadComplete);

        // Load model & texture.
        let textureUrl =
            textureType === TextureType.Icon ? undefined :
                textureType === TextureType.Test ? 'https://threejs.org/examples/textures/uv_grid_opengl.jpg' :
                    textureType === TextureType.Plain ? 'https://upload.wikimedia.org/wikipedia/commons/7/70/Solid_white.svg' :
                        (() => { throw new Error("Unknown TextureType"); })();
        const objLoader = new TexturedOBJLoader(loadingManager);
        objLoader.loadV2(
            `/icons/${iconcode}/${variant}.obj`,
            textureUrl,
            (obj) => { this.icon = obj; },
            onProgress,
            onError
        );

        function onProgress(e: ProgressEvent) {
            // TODO: Maybe display download progress for model + texture.
        }

        function onError(e: ErrorEvent) {
            console.error(`OBJ Model load error. Message: '${e.message}'`);
        }

        // Fetch animation data (if request doesn't succeed assume there is no animation).
        var animResponse = await fetch(`/icons/${iconcode}/${variant}.anim`);
        if (animResponse.ok)
        {
            var animText = await animResponse.text();

            if (animText.startsWith('{'))
            {
                var animJson = JSON.parse(animText) as AnimationData;
                this.animData = animJson;
            }
            else
            {
                console.warn('Animation data request response did not look like JSON.');
            }
        }
        else
        {
            console.warn(`Request for animation data failed with status ${animResponse.status}`);
        }
    }

    // Ran when either obj or texture loading is complete.
    assetLoadComplete() {
        if (this.icon)
        {
            this.icon.traverse(child => {
                if (child instanceof THREE.Mesh)
                {
                    this.mesh = child;
                    this.geometry = child.geometry;
                    child.material.wireframe = true;
                }
            });

            // Detect "center" of icon and place it on a pivot by there.
            let boundingBox = new THREE.Box3().setFromObject(this.icon)
            let center = new THREE.Vector3();
            boundingBox.getCenter(center);  // Weird library design, rather than use the return value, copies the result into the parameter.

            this.pivot = new THREE.Group();
            this.icon.position.sub(center);
            this.pivot.add(this.icon);
            this.scene.add(this.pivot);
        }
    }

    createStats(): Stats {
        var stats = new Stats();
        stats.dom.style.position = 'absolute';
        stats.dom.style.bottom = '0px';
        stats.dom.style.top = '';

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
        //windowHalfX = window.innerWidth / 2;
        //windowHalfY = window.innerHeight / 2;
        console.log('Resize!');

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        if (this.renderer)
        {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
        }
    }

    public animate() {
        requestAnimationFrame(this.animate);
        this.controls?.update();
        this.stats.update();
        this.render();
    }

    render() {
        this.axesHelper.visible = this.prop_grid;
        this.verticalGridHelper.visible = this.prop_grid;
        this.horizontalGridHelper.visible = this.prop_grid;
        this.renderer?.setClearColor(new THREE.Color(this.prop_backgroundColor));

        if (this.mesh)
        {
            this.mesh.material.wireframe = this.prop_meshType === MeshType.Wireframe;
        }

        if (this.prop_animate && this.animData && this.geometry)
        {
            var animationTotalFrames = this.animData.frames.length;
            var secondsForWholeAnimation = ModelRendererImpl.secondsPerAnimationFrame * animationTotalFrames;
            var animationFrame = Math.floor((this.clock.getElapsedTime() % secondsForWholeAnimation) / ModelRendererImpl.secondsPerAnimationFrame);
            //console.log(`animationFrame: ${animationFrame}`);

            // Modify the positions of each vertex.
            const positionAttribute = this.geometry.attributes.position;
            const updatedPositions = new Float32Array(positionAttribute.count * 3);
            for (let i = 0; i < positionAttribute.count; i++) 
            {
                let [x1, y1, z1] = this.wrappedIndex(this.animData.frames, animationFrame).vertexData.slice(i * 3, (i * 3) + 3);
                x1 = -x1; y1 = -y1;

                let [x2, y2, z2] = this.wrappedIndex(this.animData.frames, animationFrame + 1).vertexData.slice(i * 3, (i * 3) + 3);
                x2 = -x2; y2 = -y2;

                var interp = (this.clock.getElapsedTime() % ModelRendererImpl.secondsPerAnimationFrame) / ModelRendererImpl.secondsPerAnimationFrame;
                updatedPositions[i * 3 + 0] = this.lerp(x1, x2, interp);
                updatedPositions[i * 3 + 1] = this.lerp(y1, y2, interp);
                updatedPositions[i * 3 + 2] = this.lerp(z1, z2, interp);
            }

            this.geometry.setAttribute('position', new THREE.BufferAttribute(updatedPositions, 3));
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

    lerp(start: number, end: number, t: number) {
        return start * (1 - t) + end * t;
    }

    wrappedIndex<T>(array: T[], index: number): T {
        return array[index % array.length];
    }
}

export default ModelRendererImpl;