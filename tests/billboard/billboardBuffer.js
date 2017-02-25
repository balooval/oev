
var BillboardBuffer = (function(){
	'use strict';
	
	var nbBillboards = 10;
	var offsets;
	var geometry = new THREE.Geometry();
	var faceSize = 2;
	
	var api = {
		
		generate : function(_nb) {
			nbBillboards = _nb || nbBillboards;
			offsets = new Float32Array( nbBillboards * 12 );
			for (var i = 0; i < nbBillboards; i ++) {
				makeFaces(geometry);
			}
			geometry = new THREE.BufferGeometry().fromGeometry(geometry);
			geometry.addAttribute('offset',new THREE.BufferAttribute(offsets,2))
			return geometry;
		}
	}
	
	function makeFaces() {
		var nbVert = geometry.vertices.length;
		var localOffsetX = 0;
		var localOffsetY = 0;
		geometry.vertices.push(
			new THREE.Vector3(-1 * faceSize + localOffsetX, -1 * faceSize, 0 + localOffsetY), 
			new THREE.Vector3(1 * faceSize + localOffsetX, -1 * faceSize, 0 + localOffsetY), 
			new THREE.Vector3(1 * faceSize + localOffsetX, 1 * faceSize, 0 + localOffsetY), 
			new THREE.Vector3(1 * faceSize + localOffsetX, 1 * faceSize, 0 + localOffsetY), 
			new THREE.Vector3(-1 * faceSize + localOffsetX, 1 * faceSize, 0 + localOffsetY), 
			new THREE.Vector3(-1 * faceSize + localOffsetX, -1 * faceSize, 0 + localOffsetY)
		);
		geometry.faces.push(new THREE.Face3(
			nbVert + 0, 
			nbVert + 1, 
			nbVert + 2
		));
		geometry.faces.push(new THREE.Face3(
			nbVert + 3, 
			nbVert + 4, 
			nbVert + 5
		));
		
		geometry.faceVertexUvs[0].push([
			new THREE.Vector2(0, 0), 
			new THREE.Vector2(1, 0), 
			new THREE.Vector2(1, 1)
		]);
		geometry.faceVertexUvs[0].push([
			new THREE.Vector2(1, 1), 
			new THREE.Vector2(0, 1), 
			new THREE.Vector2(0, 0)
		]);
		
		localOffsetX = Math.random() * 100 - 50;
		localOffsetY = Math.random() * 100 - 50;
		nbVert *= 2;
		offsets[nbVert] = localOffsetX;
		offsets[nbVert + 1] = localOffsetY;
		offsets[nbVert + 2] = localOffsetX;
		offsets[nbVert + 3] = localOffsetY;
		offsets[nbVert + 4] = localOffsetX;
		offsets[nbVert + 5] = localOffsetY;
		offsets[nbVert + 6] = localOffsetX;
		offsets[nbVert + 7] = localOffsetY;
		offsets[nbVert + 8] = localOffsetX;
		offsets[nbVert + 9] = localOffsetY;
		offsets[nbVert + 10] = localOffsetX;
		offsets[nbVert + 11] = localOffsetY;
	}
	
	return api;
})();