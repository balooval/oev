importScripts('utils.js');
importScripts('../libs/three.js');

onmessage = function(_evt) {
	var geometry = makeTreeGeometry(_evt.data);
	postMessage(geometry);
}


// precompute datas from overpass
function makeTreeGeometry(_datas) {
	var geometry = new THREE.Geometry();
	var nbTrees = _datas.length;
	var i;
	var v;
	var vertId;
	var nbFaces;
	for (i = 0; i < nbTrees; i ++) {
		vertId = (geometry.faces.length / 2) * 6;
		nbFaces = geometry.faces.length;
		for (v = 0; v < 6; v ++) {
			geometry.vertices.push(_datas[i][v]);
		}
		geometry.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		geometry.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(1, 0), 
			new THREE.Vector2(0, 0), 
			new THREE.Vector2(0, 1)
		];
		geometry.faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		geometry.faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(0, 1), 
			new THREE.Vector2(1, 1), 
			new THREE.Vector2(1, 0)
		];
	}
	return geometry;
}