import Renderer from '../renderer.js';
import GLOBE from '../globe.js';
import * as NET_TEXTURES from '../net/NetTextures.js';
import * as SHADER from '../shader.js';

let lightAmbiant = undefined;
let colorsGradient = undefined;
let lightSun;
let orbitRadius = 0;
let meshSun = null;
const posCenter = new THREE.Vector3(0, 0, 0);
const sunParams = {
	position : new THREE.Vector3(0, 0, 0), 
	inclinaison : 0, 
	azimuth : 0, 
	luminosity : 0.2, 
};

const api = {
	
	init : function() {
		colorsGradient = getImageData(NET_TEXTURES.texture('sky_gradient').image);	
		lightSun = new THREE.DirectionalLight(0xffffff, 1);
		Renderer.scene.add(lightSun);
		lightAmbiant = new THREE.AmbientLight(0x25282d);
		Renderer.scene.add(lightAmbiant);
		GLOBE.evt.addEventListener('ZOOM_CHANGE', null, onZoomChanged);
		if (Renderer.shadowsEnabled) {
			lightSun.castShadow = true;
			updateShadow(4);
		}
		api.setTime(0.5);
	}, 

	setTime : function(_time) {
		updateSunColor(_time);
		updateSunPosition();
		return sunParams;
	}, 	
	
	activate : function(_state) {
		if (!OEV.appStarted) return false;
		if (_state) {
			createSun(GLOBE.radius * 0.7);
			api.setTime(0.5);
		} else {
			removeSun();
		}
	}, 
	
	setPosition : function(_pos) {
		posCenter.x = _pos.x;
		posCenter.y = _pos.y;
		posCenter.z = _pos.z;
		updateSunPosition();
	}
};

function onZoomChanged(_zoom) {
	updateShadow(_zoom);
}

function createSun(_skyRadius) {
	if (meshSun) return false;
	orbitRadius = _skyRadius * 0.9;
	const sunRadius = _skyRadius / 40;
	const uniformsSun = {
		sunElevation : {value : 0.5}, 
		myModelViewMatrixInverse : {value: new THREE.Matrix4()}, 
	};
	const parametersSun = {
		fragmentShader: SHADER.get('frag_sun'),
		vertexShader: SHADER.get('vert_sun'),
		uniforms: uniformsSun, 
		transparent: true, 
	};
	const materialSun = new THREE.ShaderMaterial(parametersSun);
	meshSun = new THREE.Mesh(new THREE.SphereGeometry(sunRadius, 16, 16 ), materialSun);
	Renderer.scene.add(meshSun);
}

function updateSunColor(_time) {
	if (meshSun === null) return false;
	sunParams.azimuth = (_time * -2) + 1;
	sunParams.inclinaison = Math.cos(_time * Math.PI * 2);
	let dayLightTime = Math.sin((_time) * Math.PI);
	dayLightTime = Math.max(dayLightTime - 0.67, 0.02);
	dayLightTime *= 3;
	sunParams.luminosity = dayLightTime;
	meshSun.material.uniforms.sunElevation.value = Math.abs(sunParams.inclinaison);
	var gradientValue = Math.round((Math.min(Math.max(_time, 0), 1)) * 127);
	var rampColorLight = getPixel(colorsGradient, 60, gradientValue);
	var sunCol = new THREE.Color('rgb(' + rampColorLight.r + ',' + rampColorLight.g + ',' + rampColorLight.b + ')');
	lightSun.color = sunCol;
	lightAmbiant.color.r = rampColorLight.r / 400;
	lightAmbiant.color.g = rampColorLight.g / 400;
	lightAmbiant.color.b = rampColorLight.b / 400;
	Renderer.MUST_RENDER = true;
}

function updateShadow(_zoom) {
	// const factor = 0.002;
	const factor = (20 - _zoom) / 50000;
	lightSun.shadow.camera.far = GLOBE.radius * GLOBE.globalScale;
	lightSun.shadow.camera.near = 1;
	lightSun.shadow.mapSize.width = 2048;
	lightSun.shadow.mapSize.height = 2048;
	lightSun.shadow.camera.left = lightSun.shadow.camera.far * factor * -1;
	lightSun.shadow.camera.right = lightSun.shadow.camera.far * factor;
	lightSun.shadow.camera.top = lightSun.shadow.camera.far * factor;
	lightSun.shadow.camera.bottom = lightSun.shadow.camera.far * factor * -1;
	lightSun.shadow.camera.updateProjectionMatrix();
	Renderer.MUST_RENDER = true;
}

function updateSunPosition() {
	if (!meshSun) return false;
	sunParams.position.x = Math.sin(sunParams.azimuth * Math.PI * 1) * (orbitRadius * Math.cos(sunParams.inclinaison * Math.PI * 0.5));
	sunParams.position.y = Math.sin(sunParams.inclinaison * Math.PI * 0.5) * orbitRadius;
	sunParams.position.z = 0 - Math.cos(sunParams.azimuth * Math.PI * 1) * (orbitRadius * Math.cos(sunParams.inclinaison * Math.PI * 0.5));
	meshSun.position.x = sunParams.position.x + posCenter.x;
	meshSun.position.y = sunParams.position.y + posCenter.y;
	meshSun.position.z = sunParams.position.z + posCenter.y;
	lightSun.position.x = meshSun.position.x;
	lightSun.position.y = meshSun.position.y;
	lightSun.position.z = meshSun.position.z;
	lightSun.target = OEV.cameraCtrl.pointer;
	Renderer.MUST_RENDER = true;
}

function removeSun() {
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

window.toto = function(_val) {
	lightSun.shadow.radius = _val;
	Renderer.MUST_RENDER = true;
}
	
export { api as default}