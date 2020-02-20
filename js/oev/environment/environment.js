import Renderer from '../renderer.js';
import GLOBE from '../globe.js';
import CLOUDS from './clouds.js';
import SUN from './sun.js';
import SKY from './sky.js';

let fogActive = true;
const posCenter = new THREE.Vector3(0, 0, 0);

const api = {
	
	init : function() {
		GLOBE.evt.addEventListener('TIME_CHANGED', api, api.onTimeChanged);
		GLOBE.cameraControler.evt.addEventListener('CAM_UPDATED', api, api.onCameraUpdated);
		if (fogActive){
			// Renderer.scene.fog = new THREE.Fog(0x91b8fb, 200, 500);
			Renderer.scene.fog = new THREE.Fog(0x86aaff, 500, 2000);
		}
		SUN.init();
		GLOBE.evt.addEventListener('LOD_CHANGED', api, api.onLodChanged);
		api.onLodChanged();
		api.onTimeChanged(0.5);
	}, 
	
	activate : function(_state) {
		SUN.activate(_state);
		SKY.activate(_state);
		if (_state) {
			CLOUDS.create();
			api.onTimeChanged(0.5);
		}
	}, 

	onTimeChanged : function(_time) {
		const sunParams = SUN.setTime(_time);
		SKY.setTime(_time, sunParams);
		CLOUDS.setTime(_time);
	}, 	
	
	onCameraUpdated : function(_datas) {
		posCenter.x = _datas.posLookat.x;
		posCenter.y = _datas.posLookat.y;
		posCenter.z = _datas.posLookat.z;
		SKY.setPosition(posCenter);
		SUN.setPosition(posCenter);
	}, 

	onLodChanged : function() {

	}, 
};

export {api as default}

