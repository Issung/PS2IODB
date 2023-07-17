import * as THREE from "three";
import { AnimationData } from "./AnimationData";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';

/**
 * Implementation of the 3D model view and interactions in threejs.
 * Used by ModelView.tsx component.
 */
class ModelRendererImpl {
    public prop_animate: boolean = true;

    private clock = new THREE.Clock(true);
    
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private stats: Stats;
    
    private initialised: boolean = false;
    private renderer: THREE.WebGLRenderer | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private controls: OrbitControls | undefined;
    
    private icon: THREE.Group | undefined;
    private pivot: THREE.Group | undefined;
    private geometry: THREE.BufferGeometry | undefined;
    private texture: THREE.Texture | undefined;
    private animData: AnimationData | undefined;

    //const framesPerAnimationFrame = 60;
    static readonly secondsPerAnimationFrame = 0.15;

    constructor() {
        console.log(`ModelRendererImpl constructor.`);
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, /*window.innerWidth / window.innerHeight*/ 640/480, 0.01, 2000);
        this.camera.position.z = -2;
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);

        let axesHelper = new THREE.AxesHelper(1);
        this.scene.add(axesHelper);

        let gridHelperVertical = new THREE.GridHelper(2, 5);
        gridHelperVertical.setRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(90), 0, 0));
        this.scene.add(gridHelperVertical);

        let gridHelperHorizontal = new THREE.GridHelper(2, 5);
        this.scene.add(gridHelperHorizontal);

        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        this.camera.add(pointLight);

        this.stats = this.createStats();

        document.addEventListener('resize', (e) => this.onWindowResize());
        
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
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.rotateSpeed = 0.2;
        this.controls.update();
        //renderer.setPixelRatio(window.devicePixelRatio);
        //renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public async loadNewIcon(code: string, variant: string) {
        console.log(`ModelRendererImpl loadNewIcon. Code: ${code}, Variant: ${variant}.`);

        // Remove existing icon if there is one.
        if (this.pivot) {
            this.scene.remove(this.pivot);
        }

        const loadingManager = new THREE.LoadingManager(this.assetLoadComplete);

        // Fetch OBJ (model) file.
        const objLoader = new OBJLoader(loadingManager);
        objLoader.load(`/icons/${code}/${variant}.obj`, (obj) => { this.icon = obj; }, onProgress, onError);

        // Fetch texture/material.
        const textureLoader = new THREE.TextureLoader(loadingManager);
        this.texture = textureLoader.load(`/icons/${code}/${variant}.png` /* 'https://threejs.org/examples/textures/uv_grid_opengl.jpg' */);
        this.texture.colorSpace = THREE.SRGBColorSpace;

        function onProgress(e: ProgressEvent) {
            // TODO: Maybe display download progress for model + texture.
            //if (e.lengthComputable) {
            //    const percentComplete = e.loaded / e.total * 100;
            //    console.log('model ' + Math.round(percentComplete) + '% downloaded');
            //}
        }

        function onError(e: ErrorEvent) {
            console.error(`OBJ Model load error. Message:' + ${e.message}`);
        }

        // Fetch animation data (if request doesn't succeed assume there is no animation).
        var animResponse = await fetch(`/icons/${code}/${variant}.anim`);
        if (animResponse.ok) {
            var animText = await animResponse.text();

            if (animText.startsWith('{')) {
                var animJson = JSON.parse(animText) as AnimationData;
                this.animData = animJson;
            }
            else {
                console.warn('Animation data request response did not look like JSON.');
            }
        }
        else {
            console.warn(`Request for animation data failed with status ${animResponse.status}`);
        }
    }

    // Ran when either obj or texture loading is complete.
    assetLoadComplete() {
        if (this.icon) {
            this.icon.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    this.geometry = child.geometry;
                    child.material.map = this.texture;
                }
            });

            // Detect "center" of icon and place it on a pivot by there.
            let boundingBox = new THREE.Box3().setFromObject(this.icon)
            let center = new THREE.Vector3();
            boundingBox.getCenter(center);  // Weird library design, rather than use the return value, copies the result into the parameter.
    
            //console.log(`center: ${center.x}, ${center.y}, ${center.z}`);
    
            this.pivot = new THREE.Group();
            this.icon.position.sub(center);
            this.pivot.add(this.icon);
            this.scene.add(this.pivot);
            //pivot.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -180);
        }
    }

    createStats() : Stats {
        var stats = new Stats();
        stats.dom.style.position = 'initial';
        //stats.dom.style.position = 'absolute';
        //stats.dom.style.left = '0';
        //stats.dom.style.top = '0';

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

        this.camera.aspect = 640/480;//window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        //renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public animate() {
        requestAnimationFrame(this.animate);
        this.render();
        this.controls?.update();
        this.stats.update();
    }

    render() {
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