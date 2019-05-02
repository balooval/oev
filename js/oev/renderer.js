let webGlRenderer = undefined;
let sceneWidth = 0;
let sceneHeight = 0;

const Renderer = (function() {

	const api = {
		scene : undefined, 
		camera : undefined, 
		MUST_RENDER : true, 
		raycaster : undefined, 
        shadowsEnabled : true, 
        
        init : function(_htmlContainer) {
            const elmtHtmlContainer = document.getElementById(_htmlContainer);
            const intElemClientWidth = elmtHtmlContainer.clientWidth;
            const intElemClientHeight = document.getElementById( "tools" ).clientHeight;
            sceneWidth = Math.min(intElemClientWidth, 13000);
            sceneHeight = Math.min(intElemClientHeight, 800);
            api.scene = new THREE.Scene();
            api.camera = new THREE.PerspectiveCamera(90, sceneWidth / sceneHeight, 0.1, 20000);
            webGlRenderer = new THREE.WebGLRenderer( { alpha: true, clearAlpha: 1 } );
            api.raycaster = new THREE.Raycaster();
            webGlRenderer.setSize(sceneWidth, sceneHeight);
            elmtHtmlContainer.appendChild(webGlRenderer.domElement);
            containerOffset = new THREE.Vector2(elmtHtmlContainer.offsetLeft, elmtHtmlContainer.offsetTop);
            api.camera.position.x = 0;
            api.camera.position.y = 0;
            api.camera.position.z = 500;	
            webGlRenderer.setClearColor( 0x101020, 1 );
            if (api.shadowsEnabled) {
                webGlRenderer.shadowMap.enabled = true;
                webGlRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
            }
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
    };

	return api;
})();

export {Renderer as default} 