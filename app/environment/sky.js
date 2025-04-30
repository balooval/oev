import {
	BackSide,
	Color,
	DoubleSide,
	Mesh,
	MeshBasicMaterial,
	ShaderMaterial,
	SphereGeometry,
	Vector3,
} from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import {
	GLOBE,
	PROJECTION_PLANE
} from '../core/globe.js';
import {get as Shader} from '../net/shader.js';
import { texture as TextureLoader } from '../net/textures.js';

let meshSky = null;
let skyMaterialSphere = null;
let skyMaterialPlane = null;
let colorsGradient;
const skyColor = new Color();
const planeSize = 300000;
const sphereSize = 20000;

let updatePositionFunction = updatePositionPlane;

const skyParams = {
	radius : 100, 
	transmission : 0.5, 
};

export function init() {
	colorsGradient = getImageData(TextureLoader('sky_gradient').image);
}

export function activate(state) {
	if (state === true) {
		const size = GLOBE.webglUnitsByMeter * planeSize;
		createSky(size);
	} else {
		removeSky();
	}
}

export function setTime(time, sunParams) {
	if (meshSky === null) {
		return false;
	}

	// let dayLightTime = Math.sin((time) * Math.PI);
	// dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	// dayLightTime *= 3;
	// skyParams.transmission = Math.max((1 - dayLightTime) * 2, 0.4);
	// const transmission = new Vector3();
	// transmission.x = sunParams.position.x * skyParams.transmission;
	// transmission.y = sunParams.position.y * skyParams.transmission;
	// transmission.z = sunParams.position.z * skyParams.transmission;
	// meshSky.material.uniforms.sunPos.value = transmission;
	// meshSky.material.uniforms.sunLuminosity.value = sunParams.luminosity;

	const gradientValue = Math.round((Math.min(Math.max(time, 0), 1)) * 127);
	const rampColor = getPixel(colorsGradient, 5, gradientValue);
	skyColor.setRGB(rampColor.r / 255, rampColor.g / 255, rampColor.b / 255);
	skyMaterialPlane.color = skyColor;

	skyMaterialSphere.uniforms.diffuse.value = new Vector3(
		rampColor.r / 255,
		rampColor.g / 255,
		rampColor.b / 255,
	);
}

export function setProjection(projection) {
	if (meshSky === null) {
		return false;
	}

	if (projection === PROJECTION_PLANE) {
		meshSky.material = skyMaterialPlane;
		
		meshSky.scale.x = planeSize;
		meshSky.scale.y = planeSize;
		meshSky.scale.z = planeSize;
		// }
		// updatePositionFunction = updatePositionPlane;
		
	} else {
		meshSky.material = skyMaterialSphere;
		const scale = GLOBE.getRadius() * 1.05;
		meshSky.scale.x = scale * -1;
		meshSky.scale.y = scale * -1;
		meshSky.scale.z = scale * -1;
		// meshSky.scale.x = planeSize * 2;
		// meshSky.scale.y = planeSize * 2;
		// meshSky.scale.z = planeSize * 2;
		updatePositionFunction = updatePositionSphere;
	}

	// updateSunPosition();
}

export function setPosition(cameraLookAtPosition, cameraOrientation) {
	if (meshSky === null) {
		return false;
	}

	updatePositionFunction(cameraLookAtPosition, cameraOrientation);
	Renderer.MUST_RENDER = true;
}

function updatePositionPlane(cameraLookAtPosition, cameraOrientation) {
	meshSky.position.x = cameraLookAtPosition.x;
	meshSky.position.y = cameraLookAtPosition.y - 500;
	meshSky.position.z = cameraLookAtPosition.z;
}

function updatePositionSphere(cameraLookAtPosition, cameraOrientation) {
	meshSky.position.x = 0;
	meshSky.position.y = 0;
	meshSky.position.z = 0;

	skyMaterialSphere.uniforms.cameraOrientation.value = cameraOrientation;
}

function createSky(skyRadius) {
	if (meshSky !== null) {
		return false;
	}

	const uniformsSky = {
		cameraOrientation : {value : new Vector3(0, 0, 1)}, 
		diffuse : {value : new Vector3(0, 0, 1)}, 
	};

	const parametersSky = {
		vertexShader: Shader('vert_sky'),
		fragmentShader: Shader('frag_sky'),
		uniforms: uniformsSky,
		side: BackSide,
		transparent: true,
		// side: DoubleSide,
	};
	
	
	skyMaterialSphere = new ShaderMaterial(parametersSky);
	skyMaterialPlane = new MeshBasicMaterial({color:0xff0000, side: BackSide, fog: false});
	
	meshSky = new Mesh(new SphereGeometry(1, 64, 32), skyMaterialPlane);
	meshSky.scale.x = skyRadius;
	meshSky.scale.y = skyRadius;
	meshSky.scale.z = skyRadius;
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

function getImageData(image) {
	const canvas = new OffscreenCanvas(image.width, image.height);
	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	return context.getImageData(0, 0, image.width, image.height);
}

function getPixel(imagedata, x, y) {
	const position = (x + imagedata.width * y) * 4;
	const data = imagedata.data;
	return {
		r: data[position + 0], 
		g: data[position + 1], 
		b: data[position + 2], 
		a: data[position + 3]
	};
}