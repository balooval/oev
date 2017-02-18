Oev.Model = Oev.Model || {};

Oev.Model.Tree = (function(){
	var geometry;
	var props = {
		width : 0.000025, 
		depth : 0.000015, 
		height : 10, 
	};
	
	var api = {
		generate : function(_lon, _lat, _alt) {
			buildGeometry(_lon, _lat, _alt);
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();
			geometry.uvsNeedUpdate = true;
			return geometry;
		}, 
	};
	
	
	function buildGeometry(_lon, _lat, _alt) {
		_alt -= 0;
		geometry = new THREE.Geometry();
		// var baseRotation = Math.random() * 1.6;
		var treeSize = 0.8 + Math.random() * 0.2;
		var elmtWidth = props.width * 1;
		var elmtDepth = props.depth * 1;
		var elmtHeight = props.height * treeSize;
		// var textTile = Math.random() > 0.7 ? 0 : 0.5;
		// var nbPlanes = 4;
		// var angleStep = Math.PI / nbPlanes;
		/*
		var i;
		for (i = 0; i < nbPlanes; i ++) {
			buildElmtPlane(_lon, _lat, _alt, {width: elmtWidth * Math.cos(baseRotation + angleStep * i), depth: elmtDepth * Math.sin(baseRotation + angleStep * i), height: elmtHeight, textTile:textTile});
		}
		*/
		makeTrunk(_lon, _lat, _alt, {width: elmtWidth, depth: elmtDepth, height: elmtHeight});
	}
	
	function makeTrunk(_lon, _lat, _alt, props) {
		var i;
		var j;
		var vertId = 0;
		geometry.faceVertexUvs[0] = [];
		var halfWidth = props.width / 2;
		var halfDepth = props.depth / 2;
		var sliceCurAlt;
		var trunkRadius = 0.8 + Math.random() * 0.4;
		var trunkHeight = 0.2 + Math.random() * 0.25;
		var crownHeight = Math.random() * 0.2;
		var foliageScale = 0.8 + Math.random() * 0.4;
		var sliceScales = [
			0.5 * trunkRadius, 
			0.3 * trunkRadius, 
			2 * foliageScale, 
			1.3 * foliageScale
		];
		var sliceAlts = [
			0, 
			trunkHeight, 
			trunkHeight + crownHeight, 
			1
		];
		var vertSlices = [];
		
		for (i = 0; i < sliceScales.length; i ++) {
			sliceCurAlt = _alt + props.height * sliceAlts[i];
			halfWidth = sliceScales[i] * props.width / 2;
			halfDepth = sliceScales[i] * props.depth / 2;
			vertSlices.push([
				OEV.earth.coordToXYZ(_lon - halfWidth, _lat - halfDepth, sliceCurAlt), 
				OEV.earth.coordToXYZ(_lon + halfWidth, _lat - halfDepth, sliceCurAlt), 
				OEV.earth.coordToXYZ(_lon + halfWidth, _lat + halfDepth, sliceCurAlt), 
				OEV.earth.coordToXYZ(_lon - halfWidth, _lat + halfDepth, sliceCurAlt)
			]);
		}
		var nbSlices = vertSlices.length;
		for (i = 0; i < nbSlices; i ++) {
			for (j = 0; j < vertSlices[i].length; j ++) {
				geometry.vertices.push(vertSlices[i][j]);
			}
		}
		// borders
		var nbFaces = 0;
		for (i = 0; i < nbSlices - 1; i ++) {
			for (j = 0; j < vertSlices[i].length; j ++) {
				geometry.faces.push(new THREE.Face3(vertId, ((vertId + 1) % 4) + i * 4, ((vertId + 5) % 4) + (i+1) * 4));
				/*
				geometry.faceVertexUvs[0][nbFaces] = [
					new THREE.Vector2(1, 0), 
					new THREE.Vector2(0, 0), 
					new THREE.Vector2(0, 1)
				];
				nbFaces ++;
				*/
				geometry.faces.push(new THREE.Face3(((vertId + 5) % 4) + (i+1) * 4, vertId + 4, vertId));
				/*
				geometry.faceVertexUvs[0][nbFaces] = [
					new THREE.Vector2(0, 1), 
					new THREE.Vector2(1, 1), 
					new THREE.Vector2(1, 0)
				];
				nbFaces ++;
				*/
				vertId += 1;
			}
		}
		// console.log('face', geometry.faces.length);
		// console.log('uv', geometry.faceVertexUvs[0].length);
		// top cap
		vertId = (nbSlices - 1) * 4;
		geometry.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		geometry.faces.push(new THREE.Face3(vertId + 2, vertId + 3, vertId));
		
		
		/*
		geometry.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		geometry.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(props.textTile + 0.5, 0), 
			new THREE.Vector2(props.textTile, 0), 
			new THREE.Vector2(props.textTile, 1)
		];
		geometry.faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		geometry.faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(props.textTile, 1), 
			new THREE.Vector2(props.textTile + 0.5, 1), 
			new THREE.Vector2(props.textTile + 0.5, 0)
		];
		*/
	}
	
	function buildElmtPlane(_lon, _lat, _alt, props) {
		var vertId = (geometry.faces.length / 2) * 6;
		var nbFaces = geometry.faces.length;
		var posA = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt);
		var posB = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt);
		var posC = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt + props.height);
		var posD = OEV.earth.coordToXYZ(_lon - props.width, _lat - props.depth, _alt + props.height);
		var posE = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt + props.height);
		var posF = OEV.earth.coordToXYZ(_lon + props.width, _lat + props.depth, _alt);
		geometry.vertices.push(posA);
		geometry.vertices.push(posB);
		geometry.vertices.push(posC);
		geometry.vertices.push(posD);
		geometry.vertices.push(posE);
		geometry.vertices.push(posF);
		geometry.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		geometry.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(props.textTile + 0.5, 0), 
			new THREE.Vector2(props.textTile, 0), 
			new THREE.Vector2(props.textTile, 1)
		];
		geometry.faces.push(new THREE.Face3(vertId + 3, vertId + 4, vertId + 5));
		geometry.faceVertexUvs[0][nbFaces + 1] = [
			new THREE.Vector2(props.textTile, 1), 
			new THREE.Vector2(props.textTile + 0.5, 1), 
			new THREE.Vector2(props.textTile + 0.5, 0)
		];
	}
	
	return api;
})();