let waiting = [];
const loaded = {};
let loading = false;
let callback;

export function get(_name) {
	return loaded[_name];
}

export function loadList(_shadersNames, _callback) {
	callback = _callback;
	_shadersNames.forEach(n => load(n));
}

function load(_shaderName) {
	waiting.push('vert_' + _shaderName);
	waiting.push('frag_' + _shaderName);
	loadNext();
}

function loadNext() {
	if (loading) return false;
	const fileName = waiting.pop();
	if (!fileName) {
		callback();
		return false;
	}
	loadFile(fileName);
}

function onFileLoaded(_name, _content) {
	loading = false;
	waiting = waiting.filter(f => f != _name);
	loaded[_name] = _content;
	loadNext();
}

function loadFile(_name) {
	loading = true;
	fetch('assets/shaders/' + _name + '.glsl')
	.then(function(response) {
		return response.text();
	})
	.then(function(_glsl) {
		onFileLoaded(_name, _glsl);
	}).catch(function(error) {console.log('Fetch error :', error);});
}