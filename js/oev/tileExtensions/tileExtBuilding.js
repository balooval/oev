import GLOBE from '../globe.js';
import * as TileExtension from './tileExtension.js';
import ElevationDatas from '../globeElevation.js';

export class Building {
	constructor(_tile) {
		this.loaderBuilding = OEV.earth.loaderBuilding;
		
		this.id = 'BUILDING';
		this.datas = undefined;
		this.bufferMesh = undefined;
		this.waiting = false;

		this.tile = _tile;
		if (TileExtension.Params.actives['ACTIV_' + this.id] === undefined) {
			TileExtension.Params.actives['ACTIV_' + this.id] = false;
		}
		TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		if (TileExtension.Params.actives['ACTIV_' + this.id]) {
			this.onActivate();
		}
	}

	onActivate() {
		TileExtension.Params.actives['ACTIV_' + this.id] = true;
		this.dataLoaded = false;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) {
			this.onTileReady();
		}
	}

	onDesactivate() {
		TileExtension.Params.actives['ACTIV_' + this.id] = false;
		this.hide();
	}

	onTileReady(_evt) {
		if (!this.tile.onStage || this.tile.zoom < 15) {
			return false;
		}
		var bbox = { 
			minLon : this.tile.startCoord.x, 
			maxLon : this.tile.endCoord.x, 
			minLat : this.tile.endCoord.y, 
			maxLat : this.tile.startCoord.y
		};
		this.waiting = true;
		OEV.evt.addEventListener('DEBUG', this, this.debug);
		this.loaderBuilding.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam, 
				bbox : bbox, 
			}, 
			_datas => {
				this.waiting = false;
				this.onBuildingsLoaded(_datas);
			}
		);
	}
	
	debug() {
		if (this.waiting) {
			console.log('waiting', this.tile.tileX, this.tile.tileY);
		}
	}
	
	show() {
		if (this.dataLoaded) {
			Oev.Tile.ProcessQueue.addWaiting(this);
		} else {
			this.tileReady();
		}
	}

	onTileDispose() {
		if (TileExtension.Params.actives['ACTIV_' + this.id] === true) {
			this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
			this.tile.evt.removeEventListener('HIDE', this, this.hide);
		}
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		TileExtension.evt.removeEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.dispose();
	}
	
	hide() {
		if (this.dataLoaded){
			if (this.bufferMesh != undefined) {
				OEV.scene.remove(this.bufferMesh);
			}
			OEV.MUST_RENDER = true;
		} else {
			this.loaderBuilding.abort({
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY
			});
		}
	}
	
	onBuildingsLoaded(_datas) {
		if (!TileExtension.Params.actives['ACTIV_' + this.id]) return false;
		this.dataLoaded = true;
		this.datas = _datas;
		this.construct();
		// Oev.Tile.ProcessQueue.addWaiting(this);
	}
	
	dispose() {
		this.hide();
		if (!this.dataLoaded){
			this.loaderBuilding.abort({
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
	
	buildRoof(_vertex) {
		
	}

	construct() {
		if (this.datas.length == 0) return false;
		if (this.bufferMesh != undefined) {
			OEV.scene.add(this.bufferMesh);
			return false;
		}
		let curBuilding;
		let floorsNb = 1;
		let nbVert = 0;
		let nbFaces = 0;
		for (let b = 0; b < this.datas.length; b ++) {
			curBuilding = this.datas[b];
			let buildingCoordNb = curBuilding.bufferVertex.length / 2;
			floorsNb = curBuilding.props.floorsNb;
			nbVert += buildingCoordNb * (floorsNb + 1);
			nbFaces += (buildingCoordNb * 2) * floorsNb;
		}
		const bufferVertices = new Float32Array(nbVert * 3);
		const bufferCoord = new Float32Array(nbVert * 3);
		const bufferFaces = new Uint32Array(nbFaces * 3);
		let bufferVertIndex = 0;
		let bufferFaceIndex = 0;
		let pastFaceNb = 0;
		let fondationsLat;
		for (let b = 0; b < this.datas.length; b ++) {
			curBuilding = this.datas[b];
			let buildingCoordNb = curBuilding.bufferVertex.length / 2;
			const alt = ElevationDatas.get(curBuilding.centroid[0], curBuilding.centroid[1]);
			fondationsLat = -10;
			floorsNb = curBuilding.props.floorsNb;
			const floorHeight = curBuilding.props.floorHeight;
			const minAlt = curBuilding.props.minAlt;
			for (let floor = 0; floor < floorsNb + 1; floor ++) {
				for (let c = 0; c < buildingCoordNb; c ++) {
					if (floor > 0) {
						const faceTopLeft = buildingCoordNb + c;
						const faceBottomLeft = c;
						let faceBottomRight = c + 1;
						let faceTopRight = faceBottomRight + buildingCoordNb;
						if (faceBottomRight >= buildingCoordNb) {
							faceBottomRight = 0;
							faceTopRight = buildingCoordNb;
						}
						const tmp = (floor - 1) * buildingCoordNb;
						bufferFaces[bufferFaceIndex + 0] = faceTopLeft + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 1] = faceBottomLeft + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 2] = faceBottomRight + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 3] = faceBottomRight + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 4] = faceTopRight + pastFaceNb + tmp;
						bufferFaces[bufferFaceIndex + 5] = faceTopLeft + pastFaceNb + tmp;
						bufferFaceIndex += 6;
					}
					bufferCoord[bufferVertIndex + 0] = curBuilding.bufferVertex[c * 2 + 0];
					bufferCoord[bufferVertIndex + 1] = curBuilding.bufferVertex[c * 2 + 1];
					bufferCoord[bufferVertIndex + 2] = fondationsLat + alt + minAlt + (floor * floorHeight);
					bufferVertIndex += 3;
				}
				fondationsLat = 0;
			}
			pastFaceNb += buildingCoordNb * (floorsNb + 1);
		}
		bufferVertIndex = 0;
		for (let c = 0; c < bufferCoord.length; c ++) {
			const vertPos = GLOBE.coordToXYZ(
				bufferCoord[bufferVertIndex + 0], 
				bufferCoord[bufferVertIndex + 1], 
				bufferCoord[bufferVertIndex + 2]
			);
			bufferVertices[bufferVertIndex + 0] = vertPos.x;
			bufferVertices[bufferVertIndex + 1] = vertPos.y;
			bufferVertices[bufferVertIndex + 2] = vertPos.z;
			bufferVertIndex += 3;
		}
		const bufferGeometry = new THREE.BufferGeometry();
		bufferGeometry.addAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.setIndex(new THREE.BufferAttribute(bufferFaces, 1));
		bufferGeometry.computeFaceNormals();
        bufferGeometry.computeVertexNormals();
		this.bufferMesh = new THREE.Mesh(bufferGeometry, GLOBE.buildingsWallMatBuffer);
		this.bufferMesh.receiveShadow = true;
		this.bufferMesh.castShadow = true;
		OEV.scene.add(this.bufferMesh);
		OEV.MUST_RENDER = true;
	}

}