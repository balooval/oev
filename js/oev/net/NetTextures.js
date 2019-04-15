
let textureLoader = null;
const batchs = [];
let curBatch = null;
let textLoaded = {};


export function texture(_name) {
	return textLoaded[_name];
} 

export function init() {
	textureLoader = new THREE.TextureLoader();
	textLoaded = {};
}

export function addToList(_list, _id, _url) {
	_list.push({id:_id, url:_url});
}

export function loadFile(_id, _url, _callback) {
	loadBatch([{id:_id, url:_url}], _callback);
}

export function loadBatch(_list, _callback) {
	var batch = {
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
	loadNextTexture();
}

function loadNextTexture() {
	var nextText = curBatch.list.shift();
	textureLoader.load(
		'assets/textures/' + nextText.url, 
		function(t){
			textLoaded[nextText.id] = t;
			textLoaded[nextText.id].wrapS = textLoaded[nextText.id].wrapT = THREE.RepeatWrapping;
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextTexture();
			}
		}, 
		function(xhr) {
			
		},
		function(xhr) {
			console.warn( 'Oev.Net.Textures error for loading', nextText.url );
		}
	);
}