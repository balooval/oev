import * as THREE from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import * as Shader from '../net/shader.js';
import * as NET_TEXTURES from '../net/textures.js';

let meshClouds = null;
let materialClouds = null;

const api = {
	create : function() {
		NET_TEXTURES.loadFile('cloud', 'cloud.png', createMesh);
	}, 

	setTime : function(_time) {
		if (!materialClouds) return false;
		materialClouds.uniforms.normalizedTime.value = _time;
	}
};

function createMesh() {
	const shaderParams = {
		vertexShader: Shader.get('vert_cloud'), 
		fragmentShader: Shader.get('frag_cloud'),
		uniforms: {
			map : {type: "t", value: NET_TEXTURES.texture('cloud')}, 
			normalizedTime : {value : 0.5}, 
		}, 
		side: THREE.DoubleSide, 
		transparent: true, 
		depthWrite: false, 
	};
	materialClouds = new THREE.ShaderMaterial(shaderParams);
	meshClouds = new THREE.Mesh(new THREE.Geometry(), materialClouds);
	const groupPos = new THREE.Vector3();
	const groupsDispertion = 5000;
	const doublePi = Math.PI * 2;
	for (let c = 0; c < 30; c ++) {
		if (c % 5 == 0) {
			groupPos.x = Math.random() * groupsDispertion - groupsDispertion / 2;
			groupPos.y = (Math.random() * groupsDispertion / 10 + groupsDispertion / 20) * -1;
			groupPos.z = Math.random() * groupsDispertion - groupsDispertion / 2;
		}
		const faceWidth = 10;
		const faceHeight = 10;
		const geoFinal = new THREE.Geometry();
		for (let i = 0; i < 8; i ++) {
			const geo = new THREE.Geometry();
			const tileOffset = Math.random() > 0.5 ? 0.5 : 0;
			const faceRotX = (Math.random() * doublePi) - Math.PI;
			const faceRotY = (Math.random() * doublePi) - Math.PI;
			geo.vertices.push(new THREE.Vector3(
				-1 * faceWidth, 
				1 * faceHeight,  
				0
			));
			geo.vertices.push(new THREE.Vector3(
				-1 * faceWidth, 
				-1 * faceHeight, 
				0
			));
			geo.vertices.push(new THREE.Vector3(
				1 * faceWidth, 
				-1 * faceHeight,  
				0
			));
			geo.vertices.push(new THREE.Vector3(
				1 * faceWidth, 
				1 * faceHeight,  
				0
			));
			geo.faces.push(new THREE.Face3(0, 2, 1));
			geo.faces.push(new THREE.Face3(0, 3, 2));
			geo.faceVertexUvs[0][0] = [
				new THREE.Vector2(tileOffset, 0),
				new THREE.Vector2(tileOffset + 0.5, 1),
				new THREE.Vector2(tileOffset, 1)
			];
			geo.faceVertexUvs[0][1] = [
				new THREE.Vector2(tileOffset, 0),
				new THREE.Vector2(tileOffset + 0.5, 0),
				new THREE.Vector2(tileOffset + 0.5, 1)
			];
			const tmpMesh = new THREE.Mesh(geo);
			tmpMesh.rotation.x = faceRotX;
			tmpMesh.rotation.y = faceRotY;
			geoFinal.mergeMesh(tmpMesh);
		}
		geoFinal.computeFaceNormals();
		geoFinal.computeVertexNormals();
		geoFinal.uvsNeedUpdate = true;
		geoFinal.verticesNeedUpdate = true;
		const curCloudMesh = new THREE.Mesh(geoFinal);
		const dispertion = 500;
		curCloudMesh.position.x = groupPos.x + (Math.random() * dispertion - dispertion / 2);
		curCloudMesh.position.y = groupPos.y + ((Math.random() * dispertion / 10 + dispertion / 20) * -1);
		curCloudMesh.position.z = groupPos.z + (Math.random() * dispertion - dispertion / 2);
		const curScale = 4 + (Math.random() * 40);
		curCloudMesh.scale.x = curScale * 2;
		curCloudMesh.scale.y = curScale;
		curCloudMesh.scale.z = curScale;
		meshClouds.geometry.mergeMesh(curCloudMesh);
	}
	Renderer.scene.add(meshClouds);
}

export {api as default};