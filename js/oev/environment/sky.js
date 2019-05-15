import Renderer from '../renderer.js';
import GLOBE from '../globe.js';
import * as SHADER from '../shader.js';

let meshSky = null;
let skyParams = {
	radius : 100, 
	transmission : 0.5, 
};

const api = {
	
	activate : function(_state) {
		if (_state) {
			createSky(GLOBE.radius * 0.7);
		} else {
			removeSky();
		}
    }, 
    
    setTime : function(_time, _sunParams) {
		updateSkyColor(_time, _sunParams);
	}, 	
	
	setPosition : function(_position) {
		updateSkyPosition(_position);
	}
};

function createSky(_skyRadius) {
	if (meshSky !== null) return false;
	skyParams.radius = _skyRadius * 0.9;
	const uniformsSky = {
		skyRadius : {value : _skyRadius}, 
		sunPos : {value : new THREE.Vector3(0,0,0)}, 
		sunLuminosity : {value : 0.5}, 
	};
	const parametersSky = {
		vertexShader: SHADER.get('vert_sky'),
		fragmentShader: SHADER.get('frag_sky'),
		uniforms: uniformsSky, 
		side: THREE.DoubleSide, 
	};
	const materialSky = new THREE.ShaderMaterial(parametersSky);
	meshSky = new THREE.Mesh(new THREE.SphereGeometry(_skyRadius, 32, 32), materialSky);
	Renderer.scene.add(meshSky);
}

function updateSkyColor(_time, _sunParams) {
	if (meshSky === null) return false;
	let dayLightTime = Math.sin((_time) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	skyParams.transmission = Math.max((1 - dayLightTime) * 2, 0.4);
	const transmission = new THREE.Vector3();
	transmission.x = _sunParams.position.x * skyParams.transmission;
	transmission.y = _sunParams.position.y * skyParams.transmission;
	transmission.z = _sunParams.position.z * skyParams.transmission;
	meshSky.material.uniforms.sunPos.value = transmission;
	meshSky.material.uniforms.sunLuminosity.value = _sunParams.luminosity;
}

function updateSkyPosition(_position) {
	if (meshSky === null) return false;
	meshSky.position.x = _position.x;
	meshSky.position.y = _position.y;
	meshSky.position.z = _position.z;
	Renderer.MUST_RENDER = true;
}

function removeSky() {
	Renderer.scene.remove(meshSky);
	meshSky.geometry.dispose();
	meshSky.material.dispose();
	meshSky = null;
}
	
export {api as default}