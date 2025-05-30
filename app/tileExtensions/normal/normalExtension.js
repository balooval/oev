import Renderer from '../../core/renderer.js';
import * as NormalLoader from './normalLoader.js';

export {setApiUrl} from './normalLoader.js';

export function extensionClass() {
	return NormalExtension;
}

class NormalExtension {
	constructor(tile) {
        this.id = 'NORMAL';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = tile;
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);
        this.normalScale = this.#getNormalScale(this.tile.zoom);

		if (this.tile.isReady) {
            this.onTileReady();
        }
	}

	onTileReady() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);

		if (this.dataLoaded) {
            this.tile.addExtensionNormal(this.id, this.texture.image);
            // this.tile.material.normalScale.x = this.tile.material.normalScale.y = this.normalScale;
            return true;
        }

        if (this.tile.zoom < 6) {
            return false;
        }

        if (this.tile.zoom > 15) {
            return false;
        }

		if (this.dataLoading) {
            return false;
        }

		this.dataLoading = true;
		NormalLoader.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			datas => this.onMapLoaded(datas)
		);
    }

    #getNormalScale(zoom) {
        if (this.tile.zoom >= 10) {
            return 1;
        }
        const gap = (10 - zoom) / 10;
        return 1 - (gap * 2);
    }
    
    onMapLoaded(datas) {
        if (!this.tile) {
            return false;
        }

        this.texture = datas;
		this.dataLoading = false;
		this.dataLoaded = true;
        
        if (!this.tile.isReady) {
            return false;
        }

        this.tile.addExtensionNormal(this.id, this.texture.image);
        // this.tile.material.normalMap = this.texture;
        // this.tile.material.needsUpdate = true;
        this.tile.material.normalScale.x = this.tile.material.normalScale.y = this.normalScale;
        // Renderer.MUST_RENDER = true;
    }
    
    onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		NormalLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        this.hide();
        
        if (this.texture) {
            this.texture.dispose();
        }

        this.texture = null;
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile.removeExtensionNormal(this.id);
        // this.tile.material.normalMap = null;
        // this.tile.material.needsUpdate = true;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
	
}