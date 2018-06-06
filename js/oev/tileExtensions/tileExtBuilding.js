var buildId = 0;


Oev.Tile.Extension.Building = function(_tile) {
	var ext = Object.create(Oev.Tile.Extension);
	var loaderBuilding = OEV.earth.loaderBuilding;
	
	ext.id = 'BUILDING';
	ext.datas = undefined;
	ext.bufferMesh = undefined;
	ext.tmpId = 0;
	ext.waiting = false;
	
	ext.tileReady = function() {
		if (!this.tile.onStage || this.tile.zoom < 15) {
			return false;
		}
		this.tmpId = buildId;
		buildId ++;
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		this.waiting = true;
		OEV.evt.addEventListener('DEBUG', this, this.debug);
		
		
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
				_self.waiting = false;
				_self.onBuildingsLoaded(_datas);
			}
		);
	}
	
	ext.debug = function() {
		if (this.waiting) {
			console.log('waiting', this.tile.tileX, this.tile.tileY);
		}
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
		ext.datas = _datas;
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
		OEV.MUST_RENDER = true;
	}
	
	ext.buildRoof = function(_vertex) {
		
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
		var b;
		var c;
		var f;
		var minAlt;
		var floorHeight;
		var tagFloorsStart;
		var debugLimit = Math.min(500000, this.datas.length);
		var floorsNb = 1;
		var buildingCoordNb;
		var nbCoords = 0;
		var nbVert = 0;
		var nbFaces = 0;
		for (b = 0; b < debugLimit; b ++) {
			curBuilding = this.datas[b];
			buildingCoordNb = curBuilding.bufferVertex.length / 2;
			floorsNb = curBuilding.props.floorsNb;
			nbCoords += buildingCoordNb;
			nbVert += buildingCoordNb * (floorsNb + 1);
			nbFaces += (buildingCoordNb * 2) * floorsNb;
		}
		var bufferVertices = new Float32Array(nbVert * 3);
		var bufferFaces = new Uint32Array(nbFaces * 3);
		var bufferVertIndex = 0;
		var bufferFaceIndex = 0;
		var vertCoordLon;
		var vertCoordLat;
		var vertPos;
		var faceTopLeft;
		var faceBottomLeft;
		var faceBottomRight;
		var faceTopRight;
		var pastFaceNb = 0;
		var fondationsLat;
		for (b = 0; b < debugLimit; b ++) {
			curBuilding = this.datas[b];
			buildingCoordNb = curBuilding.bufferVertex.length / 2;
			var alt = Oev.Globe.getElevationAtCoords(curBuilding.centroid[0], curBuilding.centroid[1], true);
			fondationsLat = -10;
			floorsNb = curBuilding.props.floorsNb;
			floorHeight = curBuilding.props.floorHeight;
			minAlt = curBuilding.props.minAlt;
			for (f = 0; f < floorsNb + 1; f ++) {
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
					}
					vertCoordLon = curBuilding.bufferVertex[c * 2 + 0];
					vertCoordLat = curBuilding.bufferVertex[c * 2 + 1];
					vertPos = OEV.earth.coordToXYZ(vertCoordLon, vertCoordLat, fondationsLat + alt + minAlt + (f * floorHeight));
					bufferVertices[bufferVertIndex + 0] = vertPos.x;
					bufferVertices[bufferVertIndex + 1] = vertPos.y;
					bufferVertices[bufferVertIndex + 2] = vertPos.z;
					bufferVertIndex += 3;
				}
				fondationsLat = 0;
			}
			pastFaceNb += buildingCoordNb * (floorsNb + 1);
		}
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