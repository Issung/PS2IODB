import * as THREE from "three";
import { AnimationData } from "./AnimationData";
import * as OBJLoader from 'three/examples/jsm/loaders/OBJLoader'
import Stats from 'stats.js';
import { useState } from "react";

enum MouseButton {
    NONE = -1,
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
};

let canvas: HTMLCanvasElement;
let clock = new THREE.Clock();
clock.start();

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.Renderer;
let stats: Stats;

let mouse = MouseButton.NONE;
let mouseX = 0, mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let icon: THREE.Group;
let pivot: THREE.Group;
let mesh: THREE.Mesh;
let geometry: THREE.BufferGeometry;
let texture: THREE.Texture;
let animData: AnimationData | null = null;
let currentFrameNumber = 0;

// Now called externally from React component.
//init();
//animate();

// Unfortunately we cannot employ useState() outside of React components, otherwise it would be perfect here.
let animateTest: boolean = true;
export function setAnimationState(newState: boolean) {
    animateTest = newState;
}

let initialised: boolean = false;

export function init(code: string) {
    /*if (initialised == true) {
        // React useEffect has a nasty habit of running twice per init when using react.strictmode.
        // So manually track if we've initialised so we don't get weird issues when initialising twice.
        console.log('Skipping initialisation');
        return;
    }*/

    // Reset animData because changing model with the same component reloaded keeps the old animData and glitches out.
    animData = null;

    canvas = document.querySelector('#iconRenderCanvas') as HTMLCanvasElement;

    camera = new THREE.PerspectiveCamera(45, /*window.innerWidth / window.innerHeight*/ 640/480, 0.01, 2000);
    camera.position.z = 3;
    camera.lookAt(0, 0, 0);

    // scene
    console.log(`scene children length: ${scene?.children.length}`);
    scene = new THREE.Scene();
    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    camera.add(pointLight);
    scene.add(camera);

    // manager
    function loadModel() {
        icon.traverse(function (obj: THREE.Object3D<THREE.Event>) {
            if (obj instanceof THREE.Mesh)
            {
                mesh = obj;
                geometry = mesh.geometry;
                obj.material.map = texture;
            }
        });

        // Detect "center" of icon and place it on a pivot by there.
        let boundingBox = new THREE.Box3().setFromObject(icon)
        let center = new THREE.Vector3();
        boundingBox.getCenter(center);  // Weird library design, rather than use the return value, copies the result into the parameter.

        console.log(`center: ${center.x}, ${center.y}, ${center.z}`);

        pivot = new THREE.Group();
        icon.position.sub(center);
        pivot.add(icon);
        scene.add(pivot);
    }

    const loadingManager = new THREE.LoadingManager(loadModel);

    const loader = new OBJLoader.OBJLoader(loadingManager);
    loader.load(`http://localhost:3000/icons/${code}/0.obj`, (obj) => { icon = obj; }, onProgress, onError);

    // texture
    const textureLoader = new THREE.TextureLoader(loadingManager);
    texture = textureLoader.load(`http://localhost:3000/icons/${code}/0.png` /* 'https://threejs.org/examples/textures/uv_grid_opengl.jpg' */);
    texture.colorSpace = THREE.SRGBColorSpace;

    // model

    function onProgress(xhr: ProgressEvent) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            console.log('model ' + Math.round(percentComplete) + '% downloaded');
        }
    }

    function onError() {
        console.log('model load error');
    }

    fetch(`http://localhost:3000/icons/${code}/0.anim`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            return response.json();
        })
        .then((data: AnimationData) => {
            animData = data;
        })
        .catch(error => console.log(error));

    renderer = new THREE.WebGLRenderer({ canvas });
    //renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.setSize(window.innerWidth, window.innerHeight);
    stats = createStats();
    canvas.appendChild(stats.dom);

    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('mousewheel', onDocumentMouseWheel);

    window.addEventListener('resize', onWindowResize);

    initialised = true;
}

function createStats() {
    var stats = new Stats();
    stats.dom.style.position = 'absolute';
    stats.dom.style.left = '0';
    stats.dom.style.top = '0';

    return stats;
}

export function dispose() {
    animData = null;
    geometry.dispose();
    texture.dispose();
    console.log('disposed of model view resources.');
}

function onWindowResize() {
    //windowHalfX = window.innerWidth / 2;
    //windowHalfY = window.innerHeight / 2;

    camera.aspect = 640/480;//window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    //renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event: MouseEvent) {
    mouse = event.button;
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function onMouseUp(event: MouseEvent) {
    console.log(`onMouseUp: ${mouse}`);
    // Don't prevent default if user is using side mouse buttons to go back/forward.
    if (mouse >= 1 && mouse <= 2) {
        event.preventDefault();
    }
    mouse = MouseButton.NONE;
}

function onDocumentMouseMove(event: MouseEvent) {
    if (mouse == MouseButton.NONE)
    {
        document.body.style.cursor = "auto";
        return;
    }
    else if (mouse == MouseButton.LEFT || mouse == MouseButton.RIGHT)
    {
        event.preventDefault();
        var deltaX = event.clientX - mouseX;
        var deltaY = event.clientY - mouseY;
        mouseX = event.clientX;
        mouseY = event.clientY;

        if (mouse == MouseButton.LEFT)
        {
            document.body.style.cursor = "grabbing";
            rotateScene(deltaX, deltaY);
        }
        else if (mouse == MouseButton.RIGHT)
        {
            document.body.style.cursor = "move";
            moveScene(deltaX, deltaY);
        }
    }
}

function rotateScene(deltaX: number, deltaY: number) {
    pivot.rotation.y += deltaX / 100;
    pivot.rotation.x += deltaY / 100;
}

function moveScene(deltaX: number, deltaY: number) {
    pivot.position.x += deltaX / 1000;
    pivot.position.y += -deltaY / 1000;
}

function onDocumentMouseWheel(event: WheelEvent | any) {
    camera.position.z += event.deltaY / 500;
}

export function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update();
}

//const framesPerAnimationFrame = 60;
let secondsPerAnimationFrame = 0.15;

function render() {
    if (mesh && animateTest && animData) 
    {
        var animationTotalFrames = animData.frames.length;
        var secondsForWholeAnimation = secondsPerAnimationFrame * animationTotalFrames;
        var animationFrame = Math.floor((clock.getElapsedTime() % secondsForWholeAnimation) / secondsPerAnimationFrame);
        //console.log(`animationFrame: ${animationFrame}`);

        // Modify the positions of each vertex.
        const positionAttribute = geometry.attributes.position;
        const updatedPositions = new Float32Array(positionAttribute.count * 3);
        for (let i = 0; i < positionAttribute.count; i++) 
        {
            let [x1, y1, z1] = wrappedIndex(animData.frames, animationFrame).vertexData.slice(i * 3, (i * 3) + 3);
            x1 = -x1; y1 = -y1;

            let [x2, y2, z2] = wrappedIndex(animData.frames, animationFrame + 1).vertexData.slice(i * 3, (i * 3) + 3);
            x2 = -x2; y2 = -y2;

            var interp = (clock.getElapsedTime() % secondsPerAnimationFrame) / secondsPerAnimationFrame;
            updatedPositions[i * 3 + 0] = lerp(x1, x2, interp);
            updatedPositions[i * 3 + 1] = lerp(y1, y2, interp);
            updatedPositions[i * 3 + 2] = lerp(z1, z2, interp);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(updatedPositions, 3));
    }

    currentFrameNumber += 1;
    renderer.render(scene, camera);
}

function getNextStep(current: number, max: number, step: number) {
    const steps = Array.from({ length: (max / step) }, (_, i) => (i + 1) * step);
    let next = steps.find((s) => s > current);
    if (!next)
    {
        next = step;
    }
    return next;
}

function lerp(start: number, end: number, t: number) {
    return start * (1 - t) + end * t;
}

function wrappedIndex<T>(array: T[], index: number): T {
    return array[index % array.length];
}

export { };