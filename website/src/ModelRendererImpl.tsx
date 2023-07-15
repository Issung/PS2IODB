import * as THREE from "three";
import { AnimationData } from "./AnimationData";
import * as OBJLoader from 'three/examples/jsm/loaders/OBJLoader'
import Stats from 'stats.js';
import { create } from "domain";

enum MouseButton {
    NONE = -1,
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
};

class ModelRendererImpl {
    private canvas: HTMLCanvasElement;
    private clock = new THREE.Clock(true);
    
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private renderer: THREE.Renderer;
    private stats: Stats;
    
    private mouse = MouseButton.NONE;
    private mouseX : number = 0  
    private mouseY : number = 0;
    
    private icon: THREE.Group | null = null;
    private pivot: THREE.Group | null = null;
    private mesh: THREE.Mesh | null = null;
    private geometry: THREE.BufferGeometry | null = null;
    private texture: THREE.Texture | null = null;
    private animData: AnimationData | null = null;
    public prop_animate: boolean = true;

    //const framesPerAnimationFrame = 60;
    static readonly secondsPerAnimationFrame = 0.15;

    constructor() {
        this.canvas = document.querySelector('#iconRenderCanvas') as HTMLCanvasElement;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, /*window.innerWidth / window.innerHeight*/ 640/480, 0.01, 2000);
        this.camera.position.z = -2;
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);

        let axesHelper = new THREE.AxesHelper(1);
        this.scene.add(axesHelper);

        let gridHelper = new THREE.GridHelper(2, 5);
        gridHelper.setRotationFromEuler(new THREE.Euler(90, 0, 0));
        this.scene.add(gridHelper);

        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        this.camera.add(pointLight);

        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        //renderer.setPixelRatio(window.devicePixelRatio);
        //renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.stats = this.createStats();
        this.canvas.before(this.stats.dom);

        // Bind event listeners. Must use arrow syntax so that 'this' is not undefined inside the functions.
        document.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        document.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('mousemove', (e) => this.onDocumentMouseMove(e));
        window.addEventListener('resize', (e) => this.onWindowResize());
        this.canvas.addEventListener('mousewheel', (e) => this.onMouseWheel(e));

        this.animate = this.animate.bind(this);
        this.animate();
    }

    public loadNewIcon(code: string, iconName: string) {
        const loadingManager = new THREE.LoadingManager(this.assetLoadComplete);

        const objLoader = new OBJLoader.OBJLoader(loadingManager);
        objLoader.load(`/icons/${code}/${iconName}.obj`, (obj) => { this.icon = obj; }, onProgress, onError);

        const textureLoader = new THREE.TextureLoader(loadingManager);
        this.texture = textureLoader.load(`/icons/${code}/${iconName}.png` /* 'https://threejs.org/examples/textures/uv_grid_opengl.jpg' */);
        this.texture.colorSpace = THREE.SRGBColorSpace;

        function onProgress(xhr: ProgressEvent) {
            if (xhr.lengthComputable) {
                const percentComplete = xhr.loaded / xhr.total * 100;
                console.log('model ' + Math.round(percentComplete) + '% downloaded');
            }
        }

        function onError() {
            console.log('model load error');
        }

        fetch(`/icons/${code}/${iconName}.anim`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                return response.json();
            })
            .then((data: AnimationData) => {
                this.animData = data;
            })
            .catch(error => console.log(error));
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
    
            console.log(`center: ${center.x}, ${center.y}, ${center.z}`);
    
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
        this.animData = null;
        this.geometry?.dispose();
        this.texture?.dispose();
        console.log('disposed of model view resources.');
    }

    onWindowResize() {
        //windowHalfX = window.innerWidth / 2;
        //windowHalfY = window.innerHeight / 2;

        this.camera.aspect = 640/480;//window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        //renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseDown(event: MouseEvent) {
        this.mouse = event.button;
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    onMouseUp(event: MouseEvent) {
        // Don't prevent default if user is using side mouse buttons to go back/forward.
        if (this.mouse >= 1 && this.mouse <= 2) {
            event.preventDefault();
        }

        this.mouse = MouseButton.NONE;
    }

    onDocumentMouseMove(event: MouseEvent) {
        if (this.mouse === MouseButton.NONE)
        {
            document.body.style.cursor = "auto";
            return;
        }
        else if (this.mouse === MouseButton.LEFT || this.mouse === MouseButton.RIGHT)
        {
            event.preventDefault();
            var deltaX = event.clientX - this.mouseX;
            var deltaY = event.clientY - this.mouseY;
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;

            if (this.mouse === MouseButton.LEFT)
            {
                document.body.style.cursor = "grabbing";
                this.rotateScene(deltaX, deltaY);
            }
            else if (this.mouse === MouseButton.RIGHT)
            {
                document.body.style.cursor = "move";
                this.moveScene(deltaX, deltaY);
            }
        }
    }

    rotateScene(deltaX: number, deltaY: number) {
        if (this.pivot) {
            this.pivot.rotation.y += deltaX / 100;
            this.pivot.rotation.x -= deltaY / 100;
        }
    }

    moveScene(deltaX: number, deltaY: number) {
        //this.camera.position.x += deltaX / 1000;
        //this.camera.position.y += deltaY / 1000;
        if (this.pivot) {
            this.pivot.position.x -= deltaX / 1000;
            this.pivot.position.y -= deltaY / 1000;
        }
    }

    onMouseWheel(event: WheelEvent | any) {
        this.camera.position.z -= event.deltaY / 500;
        event.preventDefault();
    }

    public animate() {
        requestAnimationFrame(this.animate);
        this.render();
        this.stats.update();
    }

    render() {
        if (this.mesh && this.prop_animate && this.animData && this.geometry) 
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

        this.renderer.render(this.scene, this.camera);
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