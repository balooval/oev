
var Billboard = (function(){
	'use strict';
	
	var geometry;
	var nbFaces = 10;
	var faceSize = 3;
	var offsets;
	var offsetsVert;
	
	var api = {
		
		buildGeometry : function() {
			
			offsets = new Float32Array( nbFaces * 18 );
			offsetsVert = new Float32Array( nbFaces * 18 );
			
			var facePos;
			var vertPos;
			var curFaceNb = 0;
			var curVertNb = 0;
			var curOffsetNb = 0;
			var faceDistribution = 100;
			geometry = new THREE.Geometry();
			for (var i = 0; i < nbFaces; i ++) {
				facePos = new THREE.Vector3(
					Math.random() * faceDistribution - faceDistribution / 2, 
					0, 
					Math.random() * faceDistribution - faceDistribution / 2
				);
				/*
				facePos = new THREE.Vector3(
					0, 
					0, 
					0
				);
				*/
				// 1st face
				vertPos = new THREE.Vector3(
					-1 * faceSize, 
					-1 * faceSize, 
					0
				);
				offsetsVert[curOffsetNb] = -1 * faceSize;
				offsetsVert[curOffsetNb + 1] = -1 * faceSize;
				offsetsVert[curOffsetNb + 2] = 0;
				vertPos.add(facePos);
				geometry.vertices.push(vertPos);
				offsets[curOffsetNb] = facePos.x;
				offsets[curOffsetNb + 1] = facePos.y;
				offsets[curOffsetNb + 2] = facePos.z;
				
				// console.log(vertPos.z, offsets[curOffsetNb+2], offsetsVert[curOffsetNb+2]);
				
				curOffsetNb += 3;
				vertPos = new THREE.Vector3(
					1 * faceSize, 
					-1 * faceSize, 
					0
				);
				offsetsVert[curOffsetNb] = 1 * faceSize;
				offsetsVert[curOffsetNb + 1] = -1 * faceSize;
				offsetsVert[curOffsetNb + 2] = 0;
				vertPos.add(facePos);
				geometry.vertices.push(vertPos);
				offsets[curOffsetNb] = facePos.x;
				offsets[curOffsetNb + 1] = facePos.y;
				offsets[curOffsetNb + 2] = facePos.z;
				
				curOffsetNb += 3;
				vertPos = new THREE.Vector3(
					1 * faceSize, 
					1 * faceSize, 
					0
				);
				offsetsVert[curOffsetNb] = 1 * faceSize;
				offsetsVert[curOffsetNb + 1] = 1 * faceSize;
				offsetsVert[curOffsetNb + 2] = 0;
				vertPos.add(facePos);
				geometry.vertices.push(vertPos);
				offsets[curOffsetNb] = facePos.x;
				offsets[curOffsetNb + 1] = facePos.y;
				offsets[curOffsetNb + 2] = facePos.z;
				
				curOffsetNb += 3;
				geometry.faces.push(new THREE.Face3(
					curVertNb + 0, 
					curVertNb + 1, 
					curVertNb + 2
				));
				
				geometry.faceVertexUvs[0][curFaceNb] = [
					new THREE.Vector2(0, 0), 
					new THREE.Vector2(1, 0), 
					new THREE.Vector2(1, 1)
				];
				
				curVertNb += 3;
				curFaceNb ++;
				
				
		
				// 2nd face
				vertPos = new THREE.Vector3(
					1 * faceSize, 
					1 * faceSize, 
					0
				);
				offsetsVert[curOffsetNb] = 1 * faceSize;
				offsetsVert[curOffsetNb + 1] = 1 * faceSize;
				offsetsVert[curOffsetNb + 2] = 0;
				vertPos.add(facePos);
				geometry.vertices.push(vertPos);
				offsets[curOffsetNb] = facePos.x;
				offsets[curOffsetNb + 1] = facePos.y;
				offsets[curOffsetNb + 2] = facePos.z;
				
				curOffsetNb += 3;
				vertPos = new THREE.Vector3(
					-1 * faceSize, 
					1 * faceSize, 
					0
				);
				offsetsVert[curOffsetNb] = -1 * faceSize;
				offsetsVert[curOffsetNb + 1] = 1 * faceSize;
				offsetsVert[curOffsetNb + 2] = 0;
				vertPos.add(facePos);
				geometry.vertices.push(vertPos);
				offsets[curOffsetNb] = facePos.x;
				offsets[curOffsetNb + 1] = facePos.y;
				offsets[curOffsetNb + 2] = facePos.z;
				
				curOffsetNb += 3;
				vertPos = new THREE.Vector3(
					-1 * faceSize, 
					-1 * faceSize, 
					0
				);
				offsetsVert[curOffsetNb] = -1 * faceSize;
				offsetsVert[curOffsetNb + 1] = -1 * faceSize;
				offsetsVert[curOffsetNb + 2] = 0;
				vertPos.add(facePos);
				geometry.vertices.push(vertPos);
				offsets[curOffsetNb] = facePos.x;
				offsets[curOffsetNb + 1] = facePos.y;
				offsets[curOffsetNb + 2] = facePos.z;
				
				curOffsetNb += 3;
				geometry.faces.push(new THREE.Face3(
					curVertNb + 0, 
					curVertNb + 1, 
					curVertNb + 2
				));
				
				geometry.faceVertexUvs[0][curFaceNb] = [
					new THREE.Vector2(1, 1), 
					new THREE.Vector2(0, 1), 
					new THREE.Vector2(0, 0) 
				];
				
				curVertNb += 3;
				curFaceNb ++;
			}
			geometry = new THREE.BufferGeometry().fromGeometry(geometry);
			geometry.addAttribute('offset',new THREE.BufferAttribute(offsets,3));
			geometry.addAttribute('offsetVertice',new THREE.BufferAttribute(offsetsVert,3));
			// console.log(geometry.getAttribute('offsetVertice'));
			return geometry;
		}
	}
	
	return api;
})();