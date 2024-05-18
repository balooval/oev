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

let fogActive = true;
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
		let size = 50;
		let geometry = new BoxGeometry(size, size, size); 
		let material = new MeshBasicMaterial( {color: 0xffffff} ); 
		let cube = new Mesh(geometry, material); 
		Renderer.scene.add(cube);

		size = 50;
		geometry = new BoxGeometry(size, size, size); 
		material = new MeshBasicMaterial( {color: 0xff0000} ); 
		cube = new Mesh(geometry, material); 
		cube.position.x = 100;
		cube.position.y = 0;
		cube.position.z = 0;
		Renderer.scene.add(cube);

		size = 50;
		geometry = new BoxGeometry(size, size, size); 
		material = new MeshBasicMaterial( {color: 0x00ff00} ); 
		cube = new Mesh(geometry, material); 
		cube.position.x = 0;
		cube.position.y = 100;
		cube.position.z = 0;
		Renderer.scene.add(cube);

		size = 50;
		geometry = new BoxGeometry(size, size, size); 
		material = new MeshBasicMaterial( {color: 0x0000ff} ); 
		cube = new Mesh(geometry, material); 
		cube.position.x = 0;
		cube.position.y = 0;
		cube.position.z = 100;
		Renderer.scene.add(cube);
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
	
	onCameraUpdated : function(_datas) {
		posCenter.x = _datas.posLookat[0];
		posCenter.y = _datas.posLookat[1];
		posCenter.z = _datas.posLookat[2];
		SKY.setPosition(posCenter);
		SUN.setPosition(posCenter);
	}, 

	onLodChanged : function() {

	}, 
};

export {api as default}

