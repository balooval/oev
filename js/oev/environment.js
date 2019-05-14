import Renderer from './renderer.js';
import GLOBE from './globe.js';
import CLOUDS from './environment/clouds.js';
import SUN from './environment/sun.js';
import SKY from './environment/sky.js';

let fogActive = false;
const posCenter = new THREE.Vector3(0, 0, 0);

const api = {
	
	init : function() {
		OEV.evt.addEventListener('APP_START', api, api.onAppStart);
	}, 
	
	onAppStart : function() {
		OEV.evt.removeEventListener('APP_START', api, api.onAppStart);
		OEV.evt.addEventListener('TIME_CHANGED', api, api.onTimeChanged);
		OEV.cameraCtrl.evt.addEventListener('CAM_UPDATED', api, api.onCameraUpdated);
		if( fogActive ){
			Renderer.scene.fog = new THREE.Fog(0xc5d3ea, GLOBE.radius , GLOBE.radius * 2);
		}
		SUN.init();
		GLOBE.evt.addEventListener('LOD_CHANGED', api, api.onLodChanged);
		api.onLodChanged();
		api.onTimeChanged(0.5);
	}, 
	
	activate : function(_state) {
		if (!OEV.appStarted) return false;
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
	
	onCameraUpdated : function(_pos) {
		posCenter.x = _pos.x;
		posCenter.y = _pos.y;
		posCenter.z = _pos.z;
		SKY.setPosition(posCenter);
		SUN.setPosition(posCenter);
	}, 

	onLodChanged : function() {

	}, 
};

export {api as default}

