Oev.Model = Oev.Model || {};

Oev.Model.Tree = (function(){
	var geometry;
	var props = {
		width : 0.000025, 
		depth : 0.000015, 
		height : 10, 
	};
	
	var api = {
		generate : function(_geometry, _lon, _lat, _alt) {
			geometry = _geometry;
			buildGeometry(_lon, _lat, _alt);
			// geometry.computeFaceNormals();
			// geometry.computeVertexNormals();
			// geometry.elementsNeedUpdate = true;
			// geometry.uvsNeedUpdate = true;
			// geometry.verticesNeedUpdate = true;
			// return geometry;
		}, 
	};
	
	
	function buildGeometry(_lon, _lat, _alt) {
		var i;
		var j;
		var treeSize = 0.8 + Math.random() * 0.2;
		var elmtWidth = props.width * 1;
		var elmtDepth = props.depth * 1;
		var elmtHeight = props.height * treeSize;
		var vertBefore = geometry.vertices.length;
		var vertId = 0;
		var halfWidth = props.width / 2;
		var halfDepth = props.depth / 2;
		var sliceCurAlt;
		var trunkRadius = 0.8 + Math.random() * 0.4;
		var trunkHeight = 0.2 + Math.random() * 0.25;
		var crownHeight = Math.random() * 0.2;
		var foliageScale = 0.8 + Math.random() * 0.4;
		var tileVariant = Math.floor(Math.random() * 4) / 4;
		var texTiles = {
			trunk : {
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0, 
				endY : 0.5, 
			}, 
			foliage : {
				startX : tileVariant, 
				endX : tileVariant + 0.25, 
				startY : 0.5, 
				endY : 1, 
			}, 
		};
		var slicesTexTile = [
			'trunk', 
			'foliage', 
			'foliage', 
			'foliage', 
		];
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
		nbFaces = geometry.faces.length;
		for (i = 0; i < nbSlices - 1; i ++) {
			for (j = 0; j < vertSlices[i].length; j ++) {
				geometry.faces.push(new THREE.Face3(
					vertBefore + vertId, 
					vertBefore + (((vertId + 1) % 4) + i * 4), 
					vertBefore + (((vertId + 5) % 4) + (i+1) * 4)
				));
				geometry.faceVertexUvs[0][nbFaces] = [
					new THREE.Vector2(texTiles[slicesTexTile[i]].endX, texTiles[slicesTexTile[i]].startY), 
					new THREE.Vector2(texTiles[slicesTexTile[i]].startX, texTiles[slicesTexTile[i]].startY), 
					new THREE.Vector2(texTiles[slicesTexTile[i]].startX, texTiles[slicesTexTile[i]].endY), 
				];
				nbFaces ++;
				geometry.faces.push(new THREE.Face3(
					vertBefore + (((vertId + 5) % 4) + (i+1) * 4), 
					vertBefore + (vertId + 4), 
					vertBefore + vertId
				));
				geometry.faceVertexUvs[0][nbFaces] = [
					new THREE.Vector2(texTiles[slicesTexTile[i]].startX, texTiles[slicesTexTile[i]].endY), 
					new THREE.Vector2(texTiles[slicesTexTile[i]].endX, texTiles[slicesTexTile[i]].endY), 
					new THREE.Vector2(texTiles[slicesTexTile[i]].endX, texTiles[slicesTexTile[i]].startY), 
				];
				nbFaces ++;
				vertId += 1;
			}
		}
		// top cap
		vertId = vertBefore + ((nbSlices - 1) * 4);
		geometry.faces.push(new THREE.Face3(vertId, vertId + 1, vertId + 2));
		geometry.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(texTiles.foliage.endX, texTiles.foliage.startY), 
			new THREE.Vector2(texTiles.foliage.startX, texTiles.foliage.startY), 
			new THREE.Vector2(texTiles.foliage.startX, texTiles.foliage.endY), 
		];
		geometry.faces.push(new THREE.Face3(vertId + 2, vertId + 3, vertId));
		nbFaces ++;
		geometry.faceVertexUvs[0][nbFaces] = [
			new THREE.Vector2(texTiles.foliage.startX, texTiles.foliage.endY), 
			new THREE.Vector2(texTiles.foliage.endX, texTiles.foliage.endY), 
			new THREE.Vector2(texTiles.foliage.endX, texTiles.foliage.startY), 
		];
	}
	
	return api;
})();