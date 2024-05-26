import {
	DoubleSide,
	Mesh,
	ShaderMaterial,
	SphereGeometry,
	Vector3,
} from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import GLOBE from '../core/globe.js';
import {get as Shader} from '../net/shader.js';

let meshSky = null;

const skyParams = {
	radius : 100, 
	transmission : 0.5, 
};

export function activate(state) {
	if (state === true) {
		const size = GLOBE.webglUnitsByMeter * 100000;
		createSky(size);
	} else {
		removeSky();
	}
}

export function setTime(time, sunParams) {
	if (meshSky === null) {
		return false;
	}

	let dayLightTime = Math.sin((time) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	skyParams.transmission = Math.max((1 - dayLightTime) * 2, 0.4);
	const transmission = new Vector3();
	transmission.x = sunParams.position.x * skyParams.transmission;
	transmission.y = sunParams.position.y * skyParams.transmission;
	transmission.z = sunParams.position.z * skyParams.transmission;
	meshSky.material.uniforms.sunPos.value = transmission;
	meshSky.material.uniforms.sunLuminosity.value = sunParams.luminosity;
}

export function setPosition(_position) {
	if (meshSky === null) {
		return false;
	}

	meshSky.position.x = _position.x;
	meshSky.position.y = _position.y - 500;
	meshSky.position.z = _position.z;
	Renderer.MUST_RENDER = true;
}

function createSky(skyRadius) {
	if (meshSky !== null) {
		return false;
	}

	skyParams.radius = skyRadius;
	const uniformsSky = {
		skyRadius : {value : skyRadius}, 
		sunPos : {value : new Vector3(0,0,0)}, 
		sunLuminosity : {value : 0.5}, 
	};
	const parametersSky = {
		vertexShader: Shader('vert_sky'),
		fragmentShader: Shader('frag_sky'),
		uniforms: uniformsSky, 
		side: DoubleSide, 
	};
	const materialSky = new ShaderMaterial(parametersSky);
	meshSky = new Mesh(new SphereGeometry(skyRadius, 32, 32), materialSky);
	Renderer.scene.add(meshSky);
}

function removeSky() {
	if (meshSky === null) {
		return false;
	}
	Renderer.scene.remove(meshSky);
	meshSky.geometry.dispose();
	meshSky.material.dispose();
	meshSky = null;
}