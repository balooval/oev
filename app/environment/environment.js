import {
	BoxGeometry,
	Fog,
	Mesh,
	MeshBasicMaterial,
	Vector3,
} from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import GLOBE from '../core/globe.js';
// import CLOUDS from './clouds.js';
import SUN from './sun.js';
import * as SKY from './sky.js';

let fogActive = false;
const posCenter = new Vector3(0, 0, 0);

const api = {
	
	init : function() {
		GLOBE.evt.addEventListener('TIME_CHANGED', api, api.onTimeChanged);
		GLOBE.cameraControler.evt.addEventListener('CAM_UPDATED', api, api.onCameraUpdated);
		if (fogActive){
			// Renderer.scene.fog = new Fog(0x9de3eb, 200, 500);
			Renderer.scene.fog = new Fog(0x91b8fb, 200, 500);
			// Renderer.scene.fog = new Fog(0x86aaff, 500, 2000);
		}
		SUN.init();
		GLOBE.evt.addEventListener('LOD_CHANGED', api, api.onLodChanged);
		api.onLodChanged();
		api.onTimeChanged(0.5);

	},

	addDebugCube() {
		let size = 1000;
		let geometry = new BoxGeometry(size, size, size); 
		let material = new MeshBasicMaterial( {color: 0xffffff} ); 
		let cube = new Mesh(geometry, material); 
		// Renderer.scene.add(cube);

		geometry = new BoxGeometry(size, size, size); 
		material = new MeshBasicMaterial( {color: 0xff0000} ); 
		cube = new Mesh(geometry, material); 
		cube.position.x = size * 2;
		cube.position.y = 0;
		cube.position.z = 0;
		// Renderer.scene.add(cube);

		geometry = new BoxGeometry(size, size, size); 
		material = new MeshBasicMaterial( {color: 0x00ff00} ); 
		cube = new Mesh(geometry, material); 
		cube.position.x = 0;
		cube.position.y = size * 2;
		cube.position.z = 0;
		// Renderer.scene.add(cube);

		geometry = new BoxGeometry(size, size, size); 
		material = new MeshBasicMaterial( {color: 0x0000ff} ); 
		cube = new Mesh(geometry, material); 
		cube.position.x = 0;
		cube.position.y = 0;
		cube.position.z = size * 2;
		// Renderer.scene.add(cube);
	}, 
	
	activate : function(_state) {
		api.addDebugCube();
		SUN.activate(_state);
		// SKY.activate(_state);
		if (_state) {
			// CLOUDS.create();
			api.onTimeChanged(0.5);
		}
	}, 

	onTimeChanged : function(time) {
		const sunParams = SUN.setTime(time);
		SKY.setTime(time, sunParams);
		// CLOUDS.setTime(_time);
	}, 	
	
	onCameraUpdated : function(cameraDatas) {
		posCenter.x = cameraDatas.posLookat[0];
		posCenter.y = cameraDatas.posLookat[1];
		posCenter.z = cameraDatas.posLookat[2];
		SKY.setPosition(posCenter);
		SUN.setPosition(posCenter);
	}, 

	onLodChanged : function(lod) {
		
	}, 
};

export {api as default}

