import Renderer from '../../core/renderer.js';
import GLOBE from '../../core/globe.js';
import ElevationStore from './elevationStore.js';
import * as LoaderElevation from './elevationLoader.js';

export {setApiUrl} from './elevationLoader.js';

export function extensionClass() {
	return ElevationExtension;
}

class ElevationExtension {
	constructor(_tile) {
		this.id = 'ELEVATION';
		this.dataLoading = false;
		this.dataLoaded = false;
		this.elevationBuffer = new Uint16Array((32 * 32) / 4);
		this.tile = _tile;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.dispose);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		if (this.dataLoaded) return false;
		this.applyElevationToGeometry(this.nearestElevationDatas());
		if (this.tile.zoom > 15) return false;
		if (this.dataLoading) return false;
		this.dataLoading = true;
		LoaderElevation.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			_datas => this.onElevationLoaded(_datas.slice(0))
		);
	}
	
	hide() {
		LoaderElevation.loader.abort({
			z : this.tile.zoom, 
			x : this.tile.tileX, 
			y : this.tile.tileY
		});
	}

	nearestElevationDatas() {
		const def = GLOBE.tilesDefinition + 1;
		const buffer = new Uint16Array(def * def);
		const vertCoords = this.tile.getVerticesPlaneCoords();
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			buffer[i] = ElevationStore.get(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				this.tile.zoom
			);
		}
		return buffer;
	}
	
	onElevationLoaded(_datas) {
		this.dataLoading = false;
		if (!this.tile.isReady) return false;
		this.dataLoaded = true;
		this.elevationBuffer = _datas;
		ElevationStore.set(this.tile, this.elevationBuffer);
		this.applyElevationToGeometry(this.elevationBuffer);
	}
	
	applyElevationToGeometry(_elevationBuffer) {
		if (!this.tile.isReady) return false;
		let curVertId = 0;
		const verticePositions = this.tile.meshe.geometry.getAttribute('position');
		const vertCoords = this.tile.getVerticesPlaneCoords();
		for (let i = 0; i < vertCoords.length / 2; i ++) {
			const vertPos = GLOBE.coordToXYZ(
				vertCoords[i * 2], 
				vertCoords[i * 2 + 1], 
				_elevationBuffer[i]
			);
			verticePositions.array[curVertId + 0] = vertPos.x;
			verticePositions.array[curVertId + 1] = vertPos.y;
			verticePositions.array[curVertId + 2] = vertPos.z;
			curVertId += 3;
		}

		verticePositions.needsUpdate = true;
		this.tile.meshe.geometry.verticesNeedUpdate = true;
		this.tile.meshe.geometry.uvsNeedUpdate = true;
		this.tile.meshe.geometry.computeFaceNormals();
		this.tile.meshe.geometry.computeVertexNormals();
		Renderer.MUST_RENDER = true;
	} 
	
	dispose() {
		this.tile.evt.removeEventListener('DISPOSE', this, this.dispose);
		this.hide();
		if (this.dataLoaded) {
			ElevationStore.delete(this.tile);
			const def = GLOBE.tilesDefinition + 1;
			const buffer = new Uint16Array(def * def);
			buffer.fill(0);
			this.applyElevationToGeometry(buffer);
		}
		this.dataLoaded = false;
		this.dataLoading = false;
		this.elevationBuffer = null;
		Renderer.MUST_RENDER = true;
	}
	
}