Oev.GeometryBuilder = (function(){
	'use strict';
	
	var nbSections = 8;
	var angleStep = Math.PI * 2 / nbSections;
	
	var api = {
		cylinder : function(_geometry, _params) {
			var i;
			var j;
			var vertBefore = _geometry.vertices.length;
			var vertId = 0;
			var halfRadius;
			var curAlt;
			var slicesPos = [];
			for (i = 0; i < _params.scales.length; i ++) {
				curAlt = _params.altitude + _params.height * _params.alts[i];
				halfRadius = (_params.scales[i] / 2);
				var tmp = [];
				for (var a = 0; a < nbSections; a ++) {
					var curAngle = a * angleStep;
					var cos = Math.cos(curAngle);
					var sin = Math.sin(curAngle);
					var altVariation = 0;
					if (i > 0 && i < _params.scales.length - 1) {
						altVariation = Math.random() * (_params.height / 10);
					}
					var curRadius = halfRadius + halfRadius * (Math.random() * _params.radiusVariations[i]);
					tmp.push(OEV.earth.coordToXYZ(_params.lon + curRadius * cos, _params.lat + curRadius * sin, curAlt + altVariation));
				}
				slicesPos.push(tmp);
			}
			var nbSlices = slicesPos.length;
			for (i = 0; i < nbSlices; i ++) {
				for (j = 0; j < slicesPos[i].length; j ++) {
					_geometry.vertices.push(slicesPos[i][j]);
				}
			}
			// borders
			var nbFaces = _geometry.faces.length;
			for (i = 0; i < nbSlices - 1; i ++) {
				for (j = 0; j < slicesPos[i].length; j ++) {
					_geometry.faces.push(new THREE.Face3(
						vertBefore + vertId, 
						vertBefore + (((vertId + 1) % nbSections) + i * nbSections), 
						vertBefore + (((vertId + (nbSections+1)) % nbSections) + (i+1) * nbSections)
					));
					_geometry.faces.push(new THREE.Face3(
						vertBefore + (((vertId + (nbSections+1)) % nbSections) + (i+1) * nbSections), 
						vertBefore + (vertId + nbSections), 
						vertBefore + vertId
					));
					
					_geometry.faceVertexUvs[0][nbFaces] = [
						new THREE.Vector2(_params.texTile[i].endX, _params.texTile[i].startY), 
						new THREE.Vector2(_params.texTile[i].startX, _params.texTile[i].startY), 
						new THREE.Vector2(_params.texTile[i].startX, _params.texTile[i].endY), 
					];
					nbFaces ++;
					_geometry.faceVertexUvs[0][nbFaces] = [
						new THREE.Vector2(_params.texTile[i].startX, _params.texTile[i].endY), 
						new THREE.Vector2(_params.texTile[i].endX, _params.texTile[i].endY), 
						new THREE.Vector2(_params.texTile[i].endX, _params.texTile[i].startY), 
					];
					nbFaces ++;
					vertId += 1;
				}
			}
		}, 
	};
	
	return api;
})();