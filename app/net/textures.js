import * as THREE from '../vendor/three.module.js';

const batchs = [];
const textLoaded = {};
let textureLoader = null;
let curBatch = null;
let serveurUrl;

export function init(_serveurUrl) {
	serveurUrl = _serveurUrl;
	textureLoader = new THREE.TextureLoader();
}

export function texture(_name) {
	return textLoaded[_name];
} 

export function addToList(_list, _id, _url) {
	_list.push({id:_id, url:_url});
}

export function loadFile(_id, _url, _callback) {
	loadBatch([{id:_id, url:_url}], _callback);
}

export function loadBatch(_list, _callback) {
	// TODO: si ressource déjà chargée appeler la callback de suite
	const batch = {
		callback : _callback, 
		list : _list, 
	};
	batchs.push(batch);
	if (curBatch === null) loadNextBatch();
}

function loadNextBatch() {
	if (batchs.length == 0) {
		curBatch = null;
		return false;
	}
	curBatch = batchs.shift();
	loadNextTexture();
}

function loadNextTexture() {
	const nextText = curBatch.list.shift();
	textureLoader.load(
		serveurUrl + '/' + nextText.url, 
		t => {
			textLoaded[nextText.id] = t;
			textLoaded[nextText.id].wrapS = textLoaded[nextText.id].wrapT = THREE.RepeatWrapping;
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextTexture();
			}
		}, 
		xhr => {},
		xhr => console.warn('NetTextures error for loading', nextText.url)
	);
}