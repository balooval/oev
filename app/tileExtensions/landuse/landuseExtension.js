import Renderer from '../../core/renderer.js';
import * as LanduseDataParser from './landuseDataParser.js';
// import * as LanduseGeometry from './landuseGeometryMap.js';
import * as LanduseGeometryPlane from './landuseGeometryPlane.js';
import * as LanduseGeometryShell from './landuseGeometryShell.js';
import * as LanduseGeometryInstances from './landuseGeometryInstances.js';
import * as LanduseMaterial from './landuseMaterial.js';
import * as LanduseLoader from './landuseLoader.js';

export {setApiUrl} from './landuseLoader.js';

export function extensionClass() {
	return LanduseExtension;
}

const moduleByZoom = {
    13: LanduseGeometryPlane,
    14: LanduseGeometryShell,
    15: LanduseGeometryInstances,
};

class LanduseExtension {
	constructor(_tile) {
		this.id = 'LANDUSE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.lod = 1;

        // this.isActive = this.tile.zoom >= 13;
        // this.isActive = this.tile.zoom == 13;

        this.landuseModule = moduleByZoom[this.tile.zoom];
        this.isActive = this.landuseModule !== undefined;

        if (LanduseMaterial.isReady) {
            this.#onRessourcesReady();
        } else {
            LanduseMaterial.evt.addEventListener('READY', this, this.#onRessourcesReady);
        }
    }

    #onRessourcesReady() {
        if (this.landuseModule) {
            this.landuseModule.initMaterials();
            LanduseMaterial.evt.removeEventListener('READY', this, this.#onRessourcesReady);
            this.tile.evt.addEventListener('SHOW', this, this.#onTileShow);
            this.tile.evt.addEventListener('DISPOSE', this, this.#onTileDispose);
            this.tile.evt.addEventListener('HIDE', this, this.#onTileHide);
            this.tile.evt.addEventListener('TILE_READY', this, this.#onTileReady);
        }

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

    #onTileShow() {
        this.landuseModule.tileShow(this.tile);
    }

    #onTileHide() {
        this.landuseModule.tileHide(this.tile);
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
        this.landuseModule.setDatas(landusesDatas, this.tile);
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
            
            if (this.isActive === true) {
                this.tile.evt.removeEventListener('SHOW', this, this.#onTileShow);
                this.tile.evt.removeEventListener('TILE_READY', this, this.#onTileReady);
                this.tile.evt.removeEventListener('DISPOSE', this, this.#onTileDispose);
                this.tile.evt.removeEventListener('HIDE', this, this.#onTileHide);

                this.landuseModule.tileRemoved(this.tile.key, this.tile);
            }

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