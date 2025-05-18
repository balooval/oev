import {
	CylinderGeometry,
	Mesh,
	MeshPhysicalMaterial,
	PlaneGeometry,
	ShaderMaterial,
	SphereGeometry,
	BackSide,
	Vector3
} from 'three';
import {
	GLOBE
} from '../core/globe.js';
import * as BufferGeometryUtils from '../vendor/BufferGeometryUtils.js';
import Renderer from '../core/renderer.js';
import * as Shader from '../net/shader.js';
import * as NET_TEXTURES from '../net/textures.js';
import * as MATH from '../core/math.js';

let material;
let mesh;

export function init() {
	// const geometry = new PlaneGeometry(10000, 10000, 10, 10);
	// const geometry = new CylinderGeometry(10000, 10000, 10000, 32);
	const geometry = new SphereGeometry(100000, 32, 16, 0, Math.PI * 2, 0, 1.6);

	const uniformsValues = {
		cutValue : {value : 0.2},
		octavesCount : {value : 4},
		persistence : {value : 0.79},
		perlinScale : {value : 0.016},
		skyColor : {value : new Vector3(1, 1, 1)},
		sunPosition : {value : new Vector3(0, 0, 0)},
	};
	
	const parametersSky = {
		vertexShader: Shader.get('vert_cloud'),
		fragmentShader: Shader.get('frag_cloud'),
		transparent: true,
		side: BackSide,
		uniforms: uniformsValues,
	};
		
		
	material = new ShaderMaterial(parametersSky);
	mesh = new Mesh(geometry, material);
	// mesh.position.z = 5000;
	// mesh.position.y = 5000;
	Renderer.scene.add(mesh);
}

export function updateSunPosition(x, y, z) {
	material.uniforms.sunPosition.value.x = x * 110000;
	material.uniforms.sunPosition.value.y = y * 110000;
	material.uniforms.sunPosition.value.z = z * 110000;
	Renderer.MUST_RENDER = true;
}

export function updatePosition(cameraLookAtPosition) {
	// mesh.position.x = cameraLookAtPosition.x;
	// mesh.position.z = cameraLookAtPosition.z;
}

export function setColor(color) {
	material.uniforms.skyColor.value = color;
	Renderer.MUST_RENDER = true;
}

export function setCutValue(value) {
	material.uniforms.cutValue.value = value;
	Renderer.MUST_RENDER = true;
}

export function setOctavesCount(value) {
	material.uniforms.octavesCount.value = value;
	Renderer.MUST_RENDER = true;
}
export function setPersistence(value) {
	material.uniforms.persistence.value = value;
	Renderer.MUST_RENDER = true;
}
export function setPerlinScale(value) {
	material.uniforms.perlinScale.value = value;
	Renderer.MUST_RENDER = true;
}

window.setCutValue = setCutValue;
window.setOctavesCount = setOctavesCount;
window.setPersistence = setPersistence;
window.setPerlinScale = setPerlinScale;