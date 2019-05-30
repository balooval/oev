const batchs = [];
const modelsLoaded = {};
let objectLoader = null;
let curBatch = null;

export function get(_name) {
	return modelsLoaded[_name];
}

export function init() {
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
	objectLoader.load(
		'assets/models/' + nextModel.url, 
		object => {
			object.rotation.x = Math.PI;
			// object.scale.x = 0.005;
			// object.scale.y = 0.005;
			// object.scale.z = 0.005;
			modelsLoaded[nextModel.id] = object;
			if (curBatch.list.length == 0) {
				curBatch.callback();
				loadNextBatch();
			}else{
				loadNextModel();
			}
		}, 
		xhr => {},
		xhr => console.warn( 'NetModels error for loading', nextModel.url )
	);
}