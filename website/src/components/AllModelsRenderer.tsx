import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { TexturedOBJLoader } from "./TexturedOBJLoader";
import { IconSys } from "../model/IconSys";
import { GameList } from "../model/GameList";

export class AllModelsRenderer {
    private camera: THREE.OrthographicCamera;
    private scene: THREE.Scene;
    private stats: Stats;

    private initialised: boolean = false;
    private renderer: THREE.WebGLRenderer | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private controls: OrbitControls | undefined;

    constructor() {
        console.log(`AllModelsRenderer constructor.`);
        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.0001, 2000);
        this.scene.add(this.camera);
        this.camera.translateZ(-5);

        const ambientLight = new THREE.AmbientLight(0xcccccc, 3);
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
        console.log(`AllModelsRenderer init. Init value: ${this.initialised}.`);
        this.initialised = true;

        this.canvas = document.querySelector('#all-models-canvas') as HTMLCanvasElement;
        this.canvas.before(this.stats.dom);

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            logarithmicDepthBuffer: true,   // Fixes z-fighting texture flickering on icons, especially when icon is zoomed out a lot.
        });
        this.onWindowResize();
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = false;
        this.controls.enableRotate = false;
        this.controls.enablePan = true;
        this.controls.update();

        // Single icon test:
        //this.loadIcon(0, 0, GameList.find(g => g.code)?.code!);

        let games = GameList.filter(g => g.code);
        let i = 0;
        const columns = 34;
        const rows = 16;

        if ((columns * rows) < games.length) {
            throw new Error(`Columns and rows must fit all ${games.length} icons.`);
        }

        for (let x = 0; x < columns; x++) {
            for (let y = 0; y < rows; y++) {
                if (i < games.length) {
                    this.loadIcon(x - (columns/2), y - (rows/2), games[i].code!);
                    i++;
                }
            }
        }
    }

    public async loadIcon(
        x: number,
        y: number,
        iconcode: string
    ) {
        let iconsys = await this.fetchIconSys(iconcode);
        let variant = iconsys.normal;

        //console.log(`ModelRendererImpl loadNewIcon. code: ${iconcode}, variant: ${variant}, textureType: ${textureType}.`);
        
        // Load model & texture.
        const loadingManager = new THREE.LoadingManager(() => this.assetLoadComplete());
        this.loadModel(x, y, loadingManager, iconcode, variant);
    }

    private loadModel(
        x: number,
        y: number,
        loadingManager: THREE.LoadingManager,
        iconcode: string,
        variant: string
    ) {
        const targetSize = 0.8;
        const objLoader = new TexturedOBJLoader(loadingManager);
        objLoader.loadV2(
            `/icons/${iconcode}/${variant}.obj`,
            undefined,
            this.loadProgress,
            (str) => { },
            this.loadError,
            (obj) => {
                let boundingBox = new THREE.Box3().setFromObject(obj)
                let size = new THREE.Vector3();
                boundingBox.getSize(size);  // Weird library design, rather than use the return value, copies the result into the parameter.
                let maxDimension = Math.max(size.x, size.y, size.z);

                
                
                this.scene.add(obj);
                
                const scale = targetSize / maxDimension;
                obj.scale.set(scale, scale, scale);

                //obj.scale.x = 0.2;
                //obj.scale.y = 0.2;
                //obj.scale.z = 0.2;
                obj.translateX(x);
                obj.translateY(y);
            }
        );
    }

    loadProgress(e: ProgressEvent) {
        // TODO: Maybe display download progress for model + texture.
    }

    loadError(e: any) {
        // Properties on `e` are `message` and `stack`.
        console.error(`Load error. Message: '${e.message}'`);
    }

    // Ran when either obj or texture loading is complete.
    assetLoadComplete() {
        
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
        this.renderer?.dispose();
        this.initialised = false;
        console.log('ModelRendererImpl dispose.');
    }

    onWindowResize() {
        this.camera.updateProjectionMatrix();

        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
        }
    }

    public animate() {
        //console.log('animate');
        requestAnimationFrame(this.animate);

        if (this.controls) {
            this.controls.enableDamping = false;
            this.controls.enableRotate = false;
            this.controls.enablePan = true;
        }

        this.controls?.update();
        this.stats.update();
        this.render();
    }

    render() {
        this.renderer?.render(this.scene, this.camera);
    }

    async fetchIconSys(iconcode: string): Promise<IconSys> {
        // The 'icons' folder goes inside the 'website/public' folder.
        var url = `/icons/${iconcode}/iconsys.json`;
        var response = await fetch(url);
        var text = await response.text();
        
        if (text.startsWith('{'))
        {
            let tmpiconsys = JSON.parse(text) as IconSys;
            return tmpiconsys;
        }
        else
        {
            throw new Error(`IconSys JSON response did not start with '{'. Body: ${text}.`)
        }
    }
}