var buildId = 0;


Oev.Tile.Extension.Building = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	var loaderBuilding = OEV.earth.loaderBuilding;
	
	ext.id = 'BUILDING';
	
	ext.datas = undefined;
	// ext.meshe = undefined;
	// ext.geometry = undefined;
	ext.bufferMesh = undefined;
	
	ext.tmpId = 0;
	
	ext.tileReady = function() {
		if (!this.tile.onStage || this.tile.zoom < 15) {
			return false;
		}
		this.tmpId = buildId;
		buildId ++;
		var bbox = { 
			"minLon" : this.tile.startCoord.x, 
			"maxLon" : this.tile.endCoord.x, 
			"minLat" : this.tile.endCoord.y, 
			"maxLat" : this.tile.startCoord.y
		};
		var _self = this;
		loaderBuilding.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam, 
				bbox : bbox, 
			}, 
			function(_datas) {
				_self.onBuildingsLoaded(_datas);
			}
		);
	}
	
	ext.show = function() {
		if (this.dataLoaded) {
			Oev.Tile.ProcessQueue.addWaiting(ext);
		} else {
			this.tileReady();
		}
	}
	
	ext.hide = function() {
		if (this.dataLoaded){
			if (this.bufferMesh != undefined) {
				OEV.scene.remove(this.bufferMesh);
			}
			/*
			if (this.meshe != undefined) {
				OEV.scene.remove(this.meshe);
			}
			*/
			OEV.MUST_RENDER = true;
		} else {
			OEV.earth.loaderBuilding.abort({
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY
			});
		}
	}
	
	ext.onBuildingsLoaded = function(_datas) {
		if (!Oev.Tile.Extension['ACTIV_' + ext.id]) {
			return false;
		}
		ext.dataLoaded = true;
		// console.log(_datas);
		ext.datas = _datas;
		// ext.geometry = new THREE.Geometry();
		// ext.geometry.dynamic = false;
		Oev.Tile.ProcessQueue.addWaiting(ext);
	}
	
	ext.dispose = function() {
		this.hide();
		if (!this.dataLoaded){
			OEV.earth.loaderBuilding.abort({
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY
			});
		}
		if (this.bufferMesh != undefined) {
			this.bufferMesh.geometry.dispose();
			this.bufferMesh = undefined;
		}
		/*
		if (this.meshe != undefined) {
			this.meshe.geometry.dispose();
			this.meshe = undefined;
		}
		*/
		OEV.MUST_RENDER = true;
	}

	ext.construct = function() {
		if (!Oev.Tile.Extension['ACTIV_' + ext.id] || !this.tile.onStage) {
			return false;
		}
		if (this.datas.length == 0) {
			return false;
		}
		if (this.bufferMesh != undefined) {
			OEV.scene.add(this.bufferMesh);
			return false;
		}
		var curBuilding;
		var nbCoords = 0;
		var nbVert = 0;
		var nbFaces = 0;
		var b;
		var c;
		var f;
		var floorHeight = 4;
		var tagFloorsNb;
		var tagFloorsStart;
		var tagFloorsMinHeight;
		var debugLimit = Math.min(50000, this.datas.length);
		// for (b = 0; b < this.datas.length; b ++) {
		for (b = 0; b < debugLimit; b ++) {
			curBuilding = this.datas[b];
			tagFloorsNb = 1;
			tagFloorsMinHeight = 0;
			tagFloorsStart = 0;
			if ('building:levels' in curBuilding['tags']) {
				tagFloorsNb = parseInt( curBuilding["tags"]["building:levels"] );
			}
			if ('building:minHeight' in curBuilding['tags']) {
				tagFloorsMinHeight = parseInt(curBuilding["tags"]["building:minHeight"]);
			}
			if ('building:min_level' in curBuilding['tags']) {
				tagFloorsStart = parseInt(curBuilding["tags"]["building:min_level"]);
				tagFloorsMinHeight = tagFloorsStart * floorHeight;
			}
			curBuilding['tags']['building:levels'] = tagFloorsNb - tagFloorsStart;
			curBuilding['tags']['building:minHeight'] = tagFloorsMinHeight;
			curBuilding['tags']['building:min_level'] = tagFloorsStart;
			nbCoords += curBuilding.vertex.length;
			nbVert += curBuilding.vertex.length * (tagFloorsNb + 1);
			nbFaces += (curBuilding.vertex.length * 2) * tagFloorsNb;
		}
		var nbFloors = 1;
		// var bufferVertices = new Float32Array(nbCoords * (nbFloors + 1) * 3);
		var bufferVertices = new Float32Array(nbVert * 3);
		// var bufferFaces = new Uint32Array((nbCoords * 2) * nbFloors * 3);
		var bufferFaces = new Uint32Array(nbFaces * 3);
		
		var bufferVertIndex = 0;
		var bufferFaceIndex = 0;
		var vertCoord;
		var vertPos;
		var buildingCoordNb;
		var faceTopLeft;
		var faceBottomLeft;
		var faceBottomRight;
		var faceTopRight;
		
		var pastFaceNb = 0;
		
		// for (b = 0; b < this.datas.length; b ++) {
		for (b = 0; b < debugLimit; b ++) {
			curBuilding = this.datas[b];
			buildingCoordNb = curBuilding.vertex.length;
			// console.log('buildingCoordNb', buildingCoordNb);
			nbFloors = curBuilding['tags']['building:levels'];
			// console.log('nbFloors', nbFloors);
			for (f = 0; f < nbFloors + 1; f ++) {
				// console.log('floor', f);
				for (c = 0; c < buildingCoordNb; c ++) {
					if (f > 0) {
						faceTopLeft = buildingCoordNb + c;
						faceBottomLeft = c;
						faceBottomRight = c + 1;
						faceTopRight = faceBottomRight + buildingCoordNb;
						if (faceBottomRight >= buildingCoordNb) {
							faceBottomRight = 0;
							faceTopRight = buildingCoordNb;
						}
						var tmp = (f-1) * buildingCoordNb;
						bufferFaces[bufferFaceIndex + 0] = faceTopLeft + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 1] = faceBottomLeft + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 2] = faceBottomRight + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 3] = faceBottomRight + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 4] = faceTopRight + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 5] = faceTopLeft + pastFaceNb + tmp;
						bufferFaceIndex += 6;
						// console.log('Face A', faceTopLeft, faceBottomLeft, faceBottomRight);
						// console.log('Face B', faceBottomRight, faceTopRight, faceTopLeft);
						// console.log('');
					}
					
					vertCoord = curBuilding.vertex[c];
					vertPos = OEV.earth.coordToXYZ(vertCoord.lon, vertCoord.lat, (f + curBuilding['tags']['building:min_level']) * 10 + curBuilding['tags']['building:minHeight']);
					bufferVertices[bufferVertIndex + 0] = vertPos.x;
					bufferVertices[bufferVertIndex + 1] = vertPos.y;
					bufferVertices[bufferVertIndex + 2] = vertPos.z;
					bufferVertIndex += 3;
				}
			}
			pastFaceNb += buildingCoordNb * (nbFloors + 1);
		}
		// console.log(bufferVertices.length / 3);
		// console.log('-------------------');
		var bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		
		this.bufferMesh = new THREE.Mesh(bufferGeometry, Oev.Globe.buildingsWallMatBuffer);
		this.bufferMesh.receiveShadow = true;
		this.bufferMesh.castShadow = true;
		OEV.scene.add(this.bufferMesh);
		OEV.MUST_RENDER = true;
	}
	
	ext.onInit(_tile);
	
	return ext;
}

Oev.Tile.Extension.Building.exculdedId = [23762981, 
	19441489, 
	201247295, 
	150335048, 
	309413981, 
	249003371, 
	249003371, 
	112452790, 
	3504257, 
	227662017, 
];