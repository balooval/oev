let webGlRenderer = undefined;
let sceneWidth = 0;
let sceneHeight = 0;
let containerOffset;
let raycaster;

const api = {
    scene : undefined, 
    camera : undefined, 
    MUST_RENDER : true, 
    shadowsEnabled : true, 
    
    init : function(_htmlContainer) {
        const elmtHtmlContainer = document.getElementById(_htmlContainer);
        containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
        const intElemClientWidth = elmtHtmlContainer.clientWidth;
        const intElemClientHeight = document.getElementById('main').clientHeight;
        sceneWidth = Math.min(intElemClientWidth, 13000);
        sceneHeight = Math.min(intElemClientHeight, 10000);
        api.scene = new THREE.Scene();
        api.camera = new THREE.PerspectiveCamera(90, sceneWidth / sceneHeight, 0.1, 20000);
        webGlRenderer = new THREE.WebGLRenderer({
            alpha: true, 
            clearAlpha: 1, 
            antialias: true, 
        });
        webGlRenderer.setSize(sceneWidth, sceneHeight);
        elmtHtmlContainer.appendChild(webGlRenderer.domElement);
        api.camera.position.x = 0;
        api.camera.position.y = 0;
        api.camera.position.z = 500;	
        webGlRenderer.setClearColor(0x101020, 1);
        if (api.shadowsEnabled) {
            webGlRenderer.shadowMap.enabled = true;
            webGlRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        raycaster = new THREE.Raycaster();
    },  

    domContainer : function() {
        return webGlRenderer.domElement;
    }, 

    sceneSize : function() {
        return [sceneWidth, sceneHeight];
    }, 

    render : function() {
        if (api.MUST_RENDER) {
            const d = new Date();
            webGlRenderer.render(api.scene, api.camera);
            api.MUST_RENDER = false;
        }
    }, 

    checkMouseWorldPos : function(_x, _y, _object) {
		const mX = ((_x - containerOffset.x) / sceneWidth) * 2 - 1;
		const mY = -((_y - containerOffset.y) / sceneHeight) * 2 + 1;
		raycaster.near = api.camera.near;
		raycaster.far = api.camera.far;
		raycaster.setFromCamera(new THREE.Vector2(mX, mY), api.camera);
		const intersects = raycaster.intersectObjects(_object.children);
		let coord = undefined;
		intersects.forEach(i => coord = i.point);
		return coord;
	}, 
};

export {api as default} 