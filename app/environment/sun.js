import {
	AmbientLight,
	CameraHelper,
	Color,
	DirectionalLight,
	DirectionalLightHelper,
	Matrix4,
	Mesh,
	ShaderMaterial,
	SphereGeometry,
	Vector3,
} from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import GLOBE from '../core/globe.js';
import * as NET_TEXTURES from '../net/textures.js';
import {get as Shader} from '../net/shader.js';

let cameraHelper;
let lightAmbiant = undefined;
let colorsGradient = undefined;
let lightSun;
let orbitRadius = 0;
let meshSun = null;
const posCenter = new Vector3(0, 0, 0);
const sunParams = {
	position : new Vector3(0, 0, 0), 
	inclinaison : 0, 
	azimuth : 0, 
	luminosity : 0.2, 
};

let updatePositionFunction = updatePositionPlane;

	
export function init() {
	colorsGradient = getImageData(NET_TEXTURES.texture('sky_gradient').image);	
	lightSun = new DirectionalLight(0xffffff, 2);
	Renderer.scene.add(lightSun);
	const directionalLightHelper = new DirectionalLightHelper(lightSun, 10);
	Renderer.scene.add(directionalLightHelper);
	lightAmbiant = new AmbientLight(0x25282d);
	Renderer.scene.add(lightAmbiant);
	
	GLOBE.evt.addEventListener('ZOOM_CHANGE', null, onZoomChanged);
	
	lightSun.castShadow = true;
	cameraHelper = new CameraHelper(lightSun.shadow.camera);
	// Renderer.scene.add(cameraHelper);
	
	updateShadow(4);
}

export function activate(_state) {
	if (_state) {
		createSun(GLOBE.webglUnitsByMeter * 1000);
		setTime(0.5);
	} else {
		removeSun();
	}
}

export function setProjection(projection) {
	if (projection === 'PLANE') {
		updatePositionFunction = updatePositionPlane;

	} else {
		updatePositionFunction = updatePositionSphere;
	}

	updateSunPosition();
}

export function setTime(_time) {
	sunParams.azimuth = (_time * 2) - 1;
	sunParams.inclinaison = Math.cos(_time * Math.PI * 2) * -1;
	updateSunColor(_time);
	updateSunPosition();
	return sunParams;
}

export function setPosition(cameraLookAtPosition) {
	posCenter.x = cameraLookAtPosition.x;
	posCenter.y = cameraLookAtPosition.y;
	posCenter.z = cameraLookAtPosition.z;
	updateSunPosition();
}


function onZoomChanged(_zoom) {
	updateShadow(_zoom);
}

function createSun(skyRadius) {
	if (meshSun) {
		return false;
	}
	orbitRadius = skyRadius;

	const sunRadius = 50;

	const uniformsSun = {
		sunElevation : {value : 0.5}, 
		myModelViewMatrixInverse : {value: new Matrix4()}, 
	};
	const parametersSun = {
		fragmentShader: Shader('frag_sun'),
		vertexShader: Shader('vert_sun'),
		uniforms: uniformsSun, 
		transparent: true, 
	};
	const materialSun = new ShaderMaterial(parametersSun);
	const geoSun = new SphereGeometry(sunRadius, 16, 16);
	meshSun = new Mesh(geoSun, materialSun);
	Renderer.scene.add(meshSun);
}

function updateSunColor(_time) {
	if (meshSun === null) {
		return false;
	}

	let dayLightTime = Math.sin((_time) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	sunParams.luminosity = dayLightTime;
	meshSun.material.uniforms.sunElevation.value = Math.abs(sunParams.inclinaison);
	const gradientValue = Math.round((Math.min(Math.max(_time, 0), 1)) * 127);
	const rampColorLight = getPixel(colorsGradient, 60, gradientValue);
	const sunCol = new Color('rgb(' + rampColorLight.r + ',' + rampColorLight.g + ',' + rampColorLight.b + ')');
	lightSun.color = sunCol;
	lightAmbiant.color.r = rampColorLight.r / 400;
	lightAmbiant.color.g = rampColorLight.g / 400;
	lightAmbiant.color.b = rampColorLight.b / 400;


	if (Renderer.scene.fog) {
		const rampColorFog = getPixel(colorsGradient, 1, gradientValue);
		Renderer.scene.fog.color.setRGB(
			rampColorFog.r / 255,
			rampColorFog.g / 255,
			rampColorFog.b / 255
		);
		Renderer.setBackgroundColor(Renderer.scene.fog.color);
	}

	Renderer.MUST_RENDER = true;
}

function updateShadow(zoom) {
	const factor = 50000000 / Math.pow(2, zoom);
	lightSun.shadow.bias = -0.001;
	const shadowSize = GLOBE.webglUnitsByMeter * factor;
	lightSun.shadow.camera.far = orbitRadius * 2;
	lightSun.shadow.camera.near = 1;
	lightSun.shadow.mapSize.width = 2048;
	lightSun.shadow.mapSize.height = 2048;
	lightSun.shadow.camera.left = shadowSize * -1;
	lightSun.shadow.camera.right = shadowSize;
	lightSun.shadow.camera.top = shadowSize;
	lightSun.shadow.camera.bottom = shadowSize * -1;
	// lightSun.shadow.camera.updateProjectionMatrix();
	cameraHelper.update();
	Renderer.MUST_RENDER = true;
}

function updateSunPosition() {
	if (!meshSun) {
		return false;
	}
	const position = updatePositionFunction();

	lightSun.position.x = position[0];
	lightSun.position.y = position[1];
	lightSun.position.z = position[2];

	lightSun.target = GLOBE.cameraControler.pointer;
	lightSun.shadow.camera.updateProjectionMatrix();
	Renderer.MUST_RENDER = true;
}

function updatePositionPlane() {
	const xSin = Math.sin(sunParams.azimuth * Math.PI);
	const xCos = Math.cos(sunParams.inclinaison * Math.PI * 0.5);
	const ySin = Math.sin(sunParams.inclinaison * Math.PI * 0.5);
	const zCos1 = Math.cos(sunParams.azimuth * Math.PI);
	const zCos2 = xCos;

	sunParams.position.x = xSin * (orbitRadius * xCos);
	sunParams.position.y = ySin * orbitRadius;
	sunParams.position.z = zCos1 * (orbitRadius * zCos2);

	const sunMeshDistance = orbitRadius * 4;
	meshSun.position.x = (xSin * (sunMeshDistance * xCos)) + posCenter.x;
	meshSun.position.y = (ySin * sunMeshDistance) + posCenter.y;
	meshSun.position.z = (zCos1 * (sunMeshDistance * zCos2)) + posCenter.z;

	return [
		sunParams.position.x + posCenter.x,
		sunParams.position.y + posCenter.y,
		sunParams.position.z + posCenter.z,
	];
}

function updatePositionSphere() {
	const cameraLookAtCoord = GLOBE.cameraControler.coordLookat;
	const sunLon = cameraLookAtCoord.x + (sunParams.azimuth * 10);
	const sunLat = cameraLookAtCoord.y;
	const position = GLOBE.coordToXYZ(sunLon, sunLat, 100000);
	sunParams.position.x = position[0];
	sunParams.position.y = position[1];
	sunParams.position.z = position[2];
	
	const meshPosition = GLOBE.coordToXYZ(sunLon, sunLat, 500000);
	meshSun.position.x = meshPosition[0];
	meshSun.position.y = meshPosition[1];
	meshSun.position.z = meshPosition[2];

	return position;
}

function removeSun() {
	if (!meshSun) {
		return false;
	}
	Renderer.scene.remove(meshSun);
	meshSun.geometry.dispose();
	meshSun.material.dispose();
	meshSun = null;
}

function getImageData(image) {
	var canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	var context = canvas.getContext( '2d' );
	context.drawImage( image, 0, 0 );
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