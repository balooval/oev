import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';


const batchs = [];
const modelsLoaded = {};
let objectLoader = null;
let gltflLoader = null;
let curBatch = null;

export function get(_name) {
	return modelsLoaded[_name];
}

export function init() {
	gltflLoader = new GLTFLoader();
	objectLoader = new THREE.ObjectLoader();
}

export function addToList(_list, _id, _url) {
	_list.push({id:_id, url:_url});
}

export function loadFile(_id, _url, _callback) {
	api.loadBatch([{id:_id, url:_url}], _callback);
}

export function loadBatch(_list, _callback) {
	const batch = {
		callback : _callback, 
		list : _list, 
	};
	batchs.push(batch);
	if (curBatch === null) {
		loadNextBatch();
	}
}

function loadNextBatch() {
	if (batchs.length == 0) {
		curBatch = null;
		return false;
	}
	curBatch = batchs.shift();
	loadNextModel();
}

function loadNextModel() {
	const nextModel = curBatch.list.shift();
	if (nextModel.url.includes('.glb')) {
		loadGlb(nextModel);
	} else {
		loadJson(nextModel);
	}
}

function loadGlb(_nextModel) {
	gltflLoader.load(
		'assets/models/' + _nextModel.url, 
		gltf => {
			console.log('gltf', gltf);
			// gltf.asset.rotation.x = Math.PI;
			modelsLoaded[_nextModel.id] = gltf.scene.children[0];
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextModel();
			}
		}, 
		xhr => {},
		xhr => console.warn( 'NetModels error for loading', _nextModel.url )
	);
}

function loadJson(_nextModel) {
	objectLoader.load(
		'assets/models/' + _nextModel.url, 
		object => {
			object.rotation.x = Math.PI;
			modelsLoaded[_nextModel.id] = object;
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextModel();
			}
		}, 
		xhr => {},
		xhr => console.warn( 'NetModels error for loading', _nextModel.url )
	);
}