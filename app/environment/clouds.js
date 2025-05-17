import {
	CylinderGeometry,
	Mesh,
	MeshPhysicalMaterial,
	PlaneGeometry,
	ShaderMaterial,
	SphereGeometry,
	BackSide
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

export function init() {
	// const geometry = new PlaneGeometry(10000, 10000, 10, 10);
	// const geometry = new CylinderGeometry(10000, 10000, 10000, 32);
	const geometry = new SphereGeometry(10000, 32, 16);
	
	const parametersSky = {
		vertexShader: Shader.get('vert_cloud'),
		fragmentShader: Shader.get('frag_cloud'),
		transparent: true,
		side: BackSide,
	};
		
		
	material = new ShaderMaterial(parametersSky);
	const mesh = new Mesh(geometry, material);
	// mesh.position.z = 5000;
	// mesh.position.y = 5000;
	GLOBE.addMeshe(mesh);
}