import * as TileExtension from './tileExtension.js';
import GLOBE from '../globe.js';
import ElevationDatas from '../globeElevation.js';

export class Elevation {
	constructor(_tile) {
		this.id = 'ELEVATION';
		this.dataLoaded = false;
		this.elevationBuffer = new Uint16Array((32 * 32) / 4);
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
		const def = GLOBE.tilesDefinition + 1;
		const buffer = new Uint16Array(def * def);
		buffer.fill(0);
		this.applyElevationToGeometry(buffer);
	}

	onTileReady(_evt) {
		if (this.dataLoaded) return false;
		this.applyElevationToGeometry(this.nearestElevationDatas());
		if (this.tile.zoom > 15) return false;
		OEV.earth.loaderEle.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onElevationLoaded(_datas.slice(0))
		);
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
		OEV.earth.loaderEle.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}

	nearestElevationDatas() {
		const def = GLOBE.tilesDefinition + 1;
		const buffer = new Uint16Array(def * def);
		const vertCoords = this.tile.getVerticesPlaneCoords();
		vertCoords.forEach((c, i) => {
			buffer[i] = ElevationDatas.get(c[0], c[1]);
		});
		return buffer;
	}
	
	onElevationLoaded(_datas) {
		if (!this.tile.isReady) return false;
		if (!TileExtension.Params.actives['ACTIV_' + this.id]) return false;
		this.dataLoaded = true;
		this.elevationBuffer = _datas;
		ElevationDatas.set(this.tile, this.elevationBuffer);
		this.applyElevationToGeometry(this.elevationBuffer);
	}
	
	applyElevationToGeometry(_elevationBuffer) {
		let curVertId = 0;
		const verticePositions = this.tile.meshe.geometry.getAttribute('position');
		const vertCoords = this.tile.getVerticesPlaneCoords();
		vertCoords.forEach((c, i) => {
			const vertPos = GLOBE.coordToXYZ(c[0], c[1], _elevationBuffer[i]);
			verticePositions.array[curVertId + 0] = vertPos.x;
			verticePositions.array[curVertId + 1] = vertPos.y;
			verticePositions.array[curVertId + 2] = vertPos.z;
			curVertId += 3;
		});
		verticePositions.needsUpdate = true;
		this.tile.meshe.geometry.verticesNeedUpdate = true;
		this.tile.meshe.geometry.uvsNeedUpdate = true;
		this.tile.meshe.geometry.computeFaceNormals();
		this.tile.meshe.geometry.computeVertexNormals();
		OEV.MUST_RENDER = true;
	} 
	
	dispose() {
		this.dataLoaded = false;
		this.elevationBuffer = null;
		OEV.MUST_RENDER = true;
	}
	
}