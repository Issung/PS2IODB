const MouseButton = Object.freeze({
    NONE: -1,
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2
});

let container;
let clock = new THREE.Clock();
clock.start();

let camera, scene, renderer, stats;

let mouse = MouseButton.NONE;
let mouseX = 0, mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

let icon;
let pivot;
let mesh;
let geometry;
let animData;
let frame = 0;

init();
animate();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 2000);
    camera.position.z = 2;
    camera.lookAt(0, 0, 0);

    // scene

    scene = new THREE.Scene();

    //const axesHelper = new THREE.AxesHelper( 5 );
    //scene.add(axesHelper);

    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    camera.add(pointLight);
    scene.add(camera);

    // manager

    function loadModel() {
        icon.traverse(function (child) {
            if (child.isMesh)
            {
                mesh = child;
                geometry = mesh.geometry;
                child.material.map = texture;
            }
        });

        // Detect "center" of icon and place it on a pivot by there.
        var boundingBox = new THREE.Box3().setFromObject(icon)
        boundingBox.getCenter(icon.position);
        icon.position.multiplyScalar(-1);

        pivot = new THREE.Group();
        scene.add(pivot);
        pivot.add(icon);
    }

    const manager = new THREE.LoadingManager(loadModel);

    // texture
    const textureLoader = new THREE.TextureLoader(manager);
    //const texture = textureLoader.load('https://threejs.org/examples/textures/uv_grid_opengl.jpg');
    const texture = textureLoader.load('http://127.0.0.1:5500/test.png');
    texture.colorSpace = THREE.SRGBColorSpace;

    // model

    function onProgress(xhr) {
        if (xhr.lengthComputable)
        {

            const percentComplete = xhr.loaded / xhr.total * 100;
            console.log('model ' + Math.round(percentComplete, 2) + '% downloaded');

        }
    }

    function onError() {

    }

    fetch('test.anim')
        .then(response => response.json())
        .then(data => {
            // Do something with the deserialized data here
            //animData.vertex_data = animData.vertex_data.slice(0,4);
            animData = data;
            
            
        });

    const loader = new THREE.OBJLoader(manager);
    loader.load('http://127.0.0.1:5500/test.obj', function (obj) {
        icon = obj;
    }, onProgress, onError);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('mousewheel', onDocumentMouseWheel);

    window.addEventListener('resize', onWindowResize);

    stats = createStats();
    document.body.appendChild(stats.domElement);
}

function createStats() {
    var stats = new Stats();

    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0';
    stats.domElement.style.top = '0';

    return stats;
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event) {
    event.preventDefault();
    mouse = event.button;
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function onMouseUp(event) {
    event.preventDefault();
    mouse = MouseButton.NONE;
}

function onDocumentMouseMove(event) {
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

function rotateScene(deltaX, deltaY) {
    pivot.rotation.y += deltaX / 100;
    pivot.rotation.x += deltaY / 100;
}

function moveScene(deltaX, deltaY) {
    pivot.position.x += deltaX / 1000;
    pivot.position.y += -deltaY / 1000;
}

function onDocumentMouseWheel(event) {
    camera.position.z += event.deltaY / 500;
}

function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update();
}

//const framesPerAnimationFrame = 60;
let secondsPerAnimationFrame = 0.15;

function render() {
    if (mesh) 
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
            [x1, y1, z1] = animData.frames.wrappedIndex(animationFrame).vertex_data.slice(i * 3, (i * 3) + 3);
            x1 = -x1; y1 = -y1;

            [x2, y2, z2] = animData.frames.wrappedIndex(animationFrame + 1).vertex_data.slice(i * 3, (i * 3) + 3);
            x2 = -x2; y2 = -y2;

            var interp = (clock.getElapsedTime() % secondsPerAnimationFrame) / secondsPerAnimationFrame;
            updatedPositions[i * 3 + 0] = lerp(x1, x2, interp);
            updatedPositions[i * 3 + 1] = lerp(y1, y2, interp);
            updatedPositions[i * 3 + 2] = lerp(z1, z2, interp);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(updatedPositions, 3));
    }

    frame += 1;
    renderer.render(scene, camera);
}

function getNextStep(current, max, step) {
    const steps = Array.from({ length: (max / step) }, (_, i) => (i + 1) * step);
    let next = steps.find((s) => s > current);
    if (!next)
    {
        next = step;
    }
    return next;
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

Array.prototype.wrappedIndex = function (index) {
    return this[index % this.length]
}