import {
    CameraHelper,
    PCFSoftShadowMap,
    PerspectiveCamera,
    Raycaster,
    Scene,
    Vector2,
    VSMShadowMap,
    WebGLRenderer,
} from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.module.js';

let webGlRenderer = undefined;
let sceneWidth = 0;
let sceneHeight = 0;
let containerOffset;
let raycaster;
// const rS = new rStats( {
//     values: {
//         frame: { caption: 'Total frame time (ms)', over: 16 },
//         raf: { caption: 'Time since last rAF (ms)' },
//         fps: { caption: 'Framerate (FPS)', below: 30 },
//         action1: { caption: 'Render action #1 (ms)' },
//         render: { caption: 'WebGL Render (ms)' }
//     },
//     groups: [
//         { caption: 'Framerate', values: [ 'fps', 'raf' ] },
//         { caption: 'Frame Budget', values: [ 'frame', 'action1', 'render' ] }
//     ]
// } );

let controls;
let orbitCamera;
let helper;

const api = {
    scene : undefined, 
    camera : undefined, 
    MUST_RENDER : true, 
    shadowsEnabled : true, 
    
    init : function(_htmlContainer) {
        const elmtHtmlContainer = document.getElementById(_htmlContainer);
        containerOffset = new Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
        const parentElmt = elmtHtmlContainer.parentNode;
        const intElemClientWidth = elmtHtmlContainer.clientWidth;
        const intElemClientHeight = parentElmt.clientHeight;
        sceneWidth = Math.min(intElemClientWidth, 13000);
        sceneHeight = Math.min(intElemClientHeight, 10000);
        api.scene = new Scene();
        api.camera = new PerspectiveCamera(75, sceneWidth / sceneHeight, 0.1, 20000);
        var canvas = document.createElement( 'canvas' );
        var context = canvas.getContext('webgl2');
        webGlRenderer = new WebGLRenderer({
            canvas: canvas, context: context, 
            alpha: true, 
            clearAlpha: 1, 
            antialias: true, 
            powerPreference: 'high-performance',
        });
        webGlRenderer.setSize(sceneWidth, sceneHeight);
        elmtHtmlContainer.appendChild(webGlRenderer.domElement);
        api.camera.position.x = 0;
        api.camera.position.y = 0;
        api.camera.position.z = -500;	
        webGlRenderer.setClearColor(0x91b8fb, 1);
        webGlRenderer.shadowMap.enabled = true;
        webGlRenderer.shadowMap.type = PCFSoftShadowMap;
        // webGlRenderer.shadowMap.type = VSMShadowMap;
        raycaster = new Raycaster();
        

        // helper = new CameraHelper(api.camera);
        // api.scene.add(helper);
        // orbitCamera = new PerspectiveCamera(90, sceneWidth / sceneHeight, 0.1, 2000000);
        // orbitCamera.position.x = 0;
        // orbitCamera.position.y = 0;
        // orbitCamera.position.z = 500;	
        // controls = new OrbitControls(orbitCamera, webGlRenderer.domElement);
        // controls.update();
    },  

    domContainer : function() {
        return webGlRenderer.domElement;
    }, 

    sceneSize : function() {
        return [sceneWidth, sceneHeight];
    }, 

    render : function() {
        // controls.update();
        // api.MUST_RENDER = true;
        // helper.update();

        if (!api.MUST_RENDER) return;
        // rS( 'frame' ).start();
        // webGlRenderer.render(api.scene, orbitCamera);
        webGlRenderer.render(api.scene, api.camera);
        api.MUST_RENDER = false;
        // rS( 'frame' ).end();
        // rS().update();
    }, 

    checkMouseWorldPos : function(x, y, object) {
		const mX = ((x - containerOffset.x) / sceneWidth) * 2 - 1;
		const mY = -((y - containerOffset.y) / sceneHeight) * 2 + 1;
		raycaster.near = api.camera.near;
		raycaster.far = api.camera.far;
		raycaster.setFromCamera(new Vector2(mX, mY), api.camera);
		const intersects = raycaster.intersectObjects(object.children);
		let coord = undefined;
		intersects.forEach(i => coord = i.point);
		return coord;
	}, 
};

window.debug = () => console.log(webGlRenderer.info)

export {api as default} 