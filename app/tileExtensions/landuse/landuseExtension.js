import Renderer from '../../core/renderer.js';
import * as LanduseDataParser from './landuseDataParser.js';
// import * as LanduseGeometry from './landuseGeometryMap.js';
// import * as LanduseGeometry from './landuseGeometryPlane.js';
import * as LanduseGeometry from './landuseGeometryShell.js';
// import * as LanduseGeometry from './landuseGeometryInstances.js';
import * as LanduseMaterial from './landuseMaterial.js';
import * as LanduseLoader from './landuseLoader.js';

export {setApiUrl} from './landuseLoader.js';

export function extensionClass() {
	return LanduseExtension;
}

class LanduseExtension {
	constructor(_tile) {
		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.lod = 1;

        // this.isActive = this.tile.zoom >= 13;
        this.isActive = this.tile.zoom == 13;

        if (LanduseMaterial.isReady) {
            this.#onRessourcesReady();
        } else {
            LanduseMaterial.evt.addEventListener('READY', this, this.#onRessourcesReady);
        }
    }

    #onRessourcesReady() {
        LanduseMaterial.evt.removeEventListener('READY', this, this.#onRessourcesReady);
        LanduseGeometry.initMaterials();
        this.tile.evt.addEventListener('SHOW', this, this.#onTileReady);
        this.tile.evt.addEventListener('DISPOSE', this, this.#onTileDispose);
        // this.tile.evt.addEventListener('HIDE', this, this.#onTileDispose);
        this.tile.evt.addEventListener('TILE_READY', this, this.#onTileReady);

        if (this.tile.isReady) {
            this.#onTileReady();
        }
    }

    #onTileReady() {
		if (this.dataLoaded) {
            return true;
        }
        if (this.dataLoading) {
            return false;
        }
        if (!this.isActive) {
            return false;
        }
		this.dataLoading = true;
		LanduseLoader.loader.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, datas => this.#onLanduseLoaded(datas)
		);
    }

    #onLanduseLoaded(datas) {
        if (!this.tile) {
            return false;
        }

		this.dataLoading = false;
		this.dataLoaded = true;

        if (!this.tile.isReady) {
            return false;
        }

        const landusesDatas = LanduseDataParser.parseDatas(datas, this.tile);
        LanduseGeometry.setDatas(landusesDatas, this.tile);
    }

    #getLod(cameraDatas) {
        const limitStart = this.tile.startCoord;
        const limitEnd = this.tile.endCoord;
        // const limitStart = this.tile.startMidCoord;
        // const limitEnd = this.tile.endMidCoord;

        if (cameraDatas.position.lon < limitStart.x) {
            return 0;
        }

        if (cameraDatas.position.lon > limitEnd.x) {
            return 0;
        }

        if (cameraDatas.position.lat < limitEnd.y) {
            return 0;
        }

        if (cameraDatas.position.lat > limitStart.y) {
            return 0;
        }

        return 1;
    }

	#onTileDispose() {
		this.dispose();
	}
	
	dispose() {
        if (this.tile) {
            this.tile.evt.removeEventListener('SHOW', this, this.#onTileReady);
            this.tile.evt.removeEventListener('TILE_READY', this, this.#onTileReady);
            this.tile.evt.removeEventListener('DISPOSE', this, this.#onTileDispose);
            // this.tile.evt.removeEventListener('HIDE', this, this.#onTileDispose);

            LanduseGeometry.tileRemoved(this.tile.key, this.tile);

            LanduseLoader.loader.abort({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY
            });

        }

		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
    }
}