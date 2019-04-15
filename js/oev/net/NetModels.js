var objectLoader = null;
var batchs = [];
var curBatch = null;
var modelsLoaded = {};


export function tmpGetModels() {
	return modelsLoaded;
}

export function onAppInit() {
	objectLoader = new THREE.ObjectLoader();
	modelsLoaded = {};
}

export function addToList(_list, _id, _url) {
	_list.push({id:_id, url:_url});
}

export function loadFile(_id, _url, _callback) {
	api.loadBatch([{id:_id, url:_url}], _callback);
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
	loadNextModel();
}

function loadNextModel() {
	var nextModel = curBatch.list.shift();
	objectLoader.load(
		'assets/models/' + nextModel.url, 
		function(object){
			object.rotation.x = Math.PI;
			object.scale.x = 0.005;
			object.scale.y = 0.005;
			object.scale.z = 0.005;
			modelsLoaded[nextModel.id] = object;
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextModel();
			}
		}, 
		function(xhr) {
			
		},
		function(xhr) {
			console.warn( 'Oev.Net.Models error for loading', nextModel.url );
		}
	);
}