Oev.GeometryBuilder = (function(){
	'use strict';
	
	var nbSections = 8;
	var angleStep = Math.PI * 2 / nbSections;
	
	var api = {
		
		foliage : function(_geometry) {
			var i;
			var plansNb = 4;
			var planScale = 0.8;
			var vert;
			var vertNb = 0;
			var faceNb = 0;
			var altBase = 0.2;
			// var slope = -4;
			var slope = 0.1;
			var angleStep = Math.PI / 2;
			var vertAngles = [
				0, 
				angleStep, 
				angleStep * 2, 
				angleStep * 3
			];
			var tile = Math.floor(Math.random() * 2) / 2;
			console.log('tile', tile);
			
			for (i = 0; i < plansNb; i ++) {
				var faceRot = Math.random() * Math.PI * 2;
				var altOffset = altBase + (0.3 * i);
				var altSlope = altBase + (slope * i);
				
				vert = new THREE.Vector3(0, altSlope, 0);
				_geometry.vertices.push(vert);
				
				vert = new THREE.Vector3(Math.cos(vertAngles[0] + faceRot) * planScale, altOffset, Math.sin(vertAngles[0] + faceRot) * planScale);
				_geometry.vertices.push(vert);
				vert = new THREE.Vector3(Math.cos(vertAngles[1] + faceRot) * planScale, altOffset, Math.sin(vertAngles[1] + faceRot) * planScale);
				_geometry.vertices.push(vert);
				vert = new THREE.Vector3(Math.cos(vertAngles[2] + faceRot) * planScale, altOffset, Math.sin(vertAngles[2] + faceRot) * planScale);
				_geometry.vertices.push(vert);
				vert = new THREE.Vector3(Math.cos(vertAngles[3] + faceRot) * planScale, altOffset, Math.sin(vertAngles[3] + faceRot) * planScale);
				_geometry.vertices.push(vert);
				
				_geometry.faces.push(new THREE.Face3(
					vertNb + 0, 
					vertNb + 2, 
					vertNb + 1
				));
				_geometry.faces.push(new THREE.Face3(
					vertNb + 0, 
					vertNb + 3, 
					vertNb + 2
				));
				_geometry.faces.push(new THREE.Face3(
					vertNb + 0, 
					vertNb + 4, 
					vertNb + 3
				));
				_geometry.faces.push(new THREE.Face3(
					vertNb + 0, 
					vertNb + 1, 
					vertNb + 4
				));
				vertNb += 5;
				
				_geometry.faceVertexUvs[0][faceNb] = [
					new THREE.Vector2(0.5, 0.5),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(0, 0)
				];
				_geometry.faceVertexUvs[0][faceNb + 1] = [
					new THREE.Vector2(0.5, 0.5),
					new THREE.Vector2(1, 1),
					new THREE.Vector2(1, 0)
				];
				_geometry.faceVertexUvs[0][faceNb + 2] = [
					new THREE.Vector2(0.5, 0.5),
					new THREE.Vector2(0, 1),
					new THREE.Vector2(1, 1)
				];
				_geometry.faceVertexUvs[0][faceNb + 3] = [
					new THREE.Vector2(0.5, 0.5),
					new THREE.Vector2(0, 0),
					new THREE.Vector2(0, 1)
				];
				
				faceNb += 4;
				
				
				
				/*
				vert = new THREE.Vector3(-1 * planScale, altOffset, -1 * planScale);
				_geometry.vertices.push(vert);
				vert = new THREE.Vector3(1 * planScale, altOffset, -1 * planScale);
				_geometry.vertices.push(vert);
				vert = new THREE.Vector3(1 * planScale, altOffset, 1 * planScale);
				_geometry.vertices.push(vert);
				vert = new THREE.Vector3(-1 * planScale, altOffset, 1 * planScale);
				_geometry.vertices.push(vert);
				_geometry.faces.push(new THREE.Face3(
					vertNb + 2, 
					vertNb + 1, 
					vertNb + 0
				));
				_geometry.faces.push(new THREE.Face3(
					vertNb + 0, 
					vertNb + 3, 
					vertNb + 2 
				));
				vertNb += 4;
				
				_geometry.faceVertexUvs[0][faceNb] = [
					new THREE.Vector2(0, 0),
					new THREE.Vector2(1, 0),
					new THREE.Vector2(1, 1)
				];
				_geometry.faceVertexUvs[0][faceNb + 1] = [
					new THREE.Vector2(1, 1),
					new THREE.Vector2(0, 1),
					new THREE.Vector2(0, 0)
				];
				faceNb += 2;
				*/
				planScale *= 0.8;
			}
		}, 
		
		
		
		
		cylinder : function(_geometry, _params) {
			var scale = _params.scale || 1;
			_params.height *= scale;
			
			nbSections = _params.nbSections || 8;
			angleStep = Math.PI * 2 / nbSections;
			var i;
			var j;
			var vertBefore = _geometry.vertices.length;
			var vertId = 0;
			var halfRadius;
			var curAlt;
			var curAngle;
			var cos;
			var sin;
			var curRadius;
			var pos;
			var slicesPos = [];
			for (i = 0; i < _params.radius.length; i ++) {
				curAlt = _params.height * _params.alts[i];
				halfRadius = (_params.radius[i] / 2) * scale;
				pos = [];
				for (j = 0; j < nbSections; j ++) {
					curAngle = j * angleStep;
					cos = Math.cos(curAngle);
					sin = Math.sin(curAngle);
					curRadius = halfRadius;
					pos.push(new THREE.Vector3(curRadius * cos, curAlt, curRadius * sin));
				}
				slicesPos.push(pos);
			}
			var nbSlices = slicesPos.length;
			for (i = 0; i < nbSlices; i ++) {
				for (j = 0; j < slicesPos[i].length; j ++) {
				// for (j = 0; j < nbSections; j ++) {
					_geometry.vertices.push(slicesPos[i][j]);
				}
			}
			// borders
			var nbFaces = _geometry.faces.length;
			for (i = 0; i < nbSlices - 1; i ++) {
				for (j = 0; j < slicesPos[i].length; j ++) {
				// for (j = 0; j < nbSections; j ++) {
					_geometry.faces.push(new THREE.Face3(
						vertBefore + (((vertId + (nbSections+1)) % nbSections) + (i+1) * nbSections),  // C
						vertBefore + (((vertId + 1) % nbSections) + i * nbSections), // B
						vertBefore + vertId // A
					));
					_geometry.faces.push(new THREE.Face3(
						vertBefore + vertId, // C
						vertBefore + (vertId + nbSections), // B
						vertBefore + (((vertId + (nbSections+1)) % nbSections) + (i+1) * nbSections) // A
					));
					var uvHorStep = (_params.texTile[i].endX - _params.texTile[i].startX) / slicesPos[i].length;
					var uvHorA = _params.texTile[i].startX + (uvHorStep * j);
					var uvHorB = uvHorA + uvHorStep;
					_geometry.faceVertexUvs[0][nbFaces] = [
						new THREE.Vector2(uvHorB, _params.texTile[i].endY), // C
						new THREE.Vector2(uvHorB, _params.texTile[i].startY), // B
						new THREE.Vector2(uvHorA, _params.texTile[i].startY), // A
					];
					nbFaces ++;
					_geometry.faceVertexUvs[0][nbFaces] = [
						new THREE.Vector2(uvHorA, _params.texTile[i].startY), // C
						new THREE.Vector2(uvHorA, _params.texTile[i].endY), // B
						new THREE.Vector2(uvHorB, _params.texTile[i].endY), // A
					];
					nbFaces ++;
					vertId += 1;
				}
			}
		}, 
	};
	
	return api;
})();