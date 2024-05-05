import Renderer from '../../core/renderer.js';
import * as LanduseGeometryBuilder from './landuseGeometryBuilder.js';
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

        this.isActive = this.tile.zoom >= 13;

        if (LanduseMaterial.isReady) {
            this.onRessourcesReady();
        } else {
            LanduseMaterial.evt.addEventListener('READY', this, this.onRessourcesReady);
        }
    }

    onRessourcesReady() {
        LanduseMaterial.evt.removeEventListener('READY', this, this.onRessourcesReady);
        this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
        this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);

        if (this.tile.isReady) {
            this.onTileReady();
        }
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		LanduseLoader.loader.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onLanduseLoaded(_datas)
		);
    }
    
    onLanduseLoaded(_datas) {
        if (!this.tile) {
            return false;
        }

		this.dataLoading = false;
		this.dataLoaded = true;

        if (!this.tile.isReady) {
            return false;
        }

        LanduseGeometryBuilder.setDatas(_datas, this.tile);
    }

	onTileDispose() {
		this.dispose();
	}
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);

        LanduseGeometryBuilder.tileRemoved(this.tile.key, this.tile);

        LanduseLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });


		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
    }
}