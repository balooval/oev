import Renderer from '../../core/renderer.js';
import * as TileExtension from '../tileExtension.js';
import * as MapLoader from './mapLoader.js';

export { setApiUrl } from './mapLoader.js';

export function extensionClass() {
	return MapExtension;
}

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_SATELLITE', null, onActivateSatellite);

function onActivateSatellite() {
    TileExtension.desactivate('TILE2D');
}

export class MapExtension {
	constructor(_tile) {
		this.id = 'TILE2D';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.texture = null;
		this.tile = _tile;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('HIDE', this, this.hide);
		if (this.tile.isReady) this.onTileReady();
	}

	onTileReady() {
		// if (this.tile.zoom > 13) {
		// 	return false;
		// }

		if (this.dataLoaded) {
            // this.tile.setTexture(this.texture);
			this.tile.addExtensionDiffuse(this.id, this.texture.image);
            return true;
        }

		if (this.dataLoading) {
			return false;
		}

		this.dataLoading = true;
		MapLoader.loader.getData(
			{
				z : this.tile.zoom, 
				x : this.tile.tileX, 
				y : this.tile.tileY, 
				priority : this.tile.distToCam
			}, 
			texture => this.onMapLoaded(texture)
		);
    }
    
    onMapLoaded(texture) {
        this.texture = texture;
		this.dataLoading = false;
		this.dataLoaded = true;
		
		if (!this.tile) {
			return false;
		}

		if (!this.tile.isReady) {
			return false;
		}
		
		// this.tile.setTexture(this.texture);
		this.tile.addExtensionDiffuse(this.id, this.texture.image);
	}
	
	onTileDispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		MapLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
		this.hide();
		this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.removeEventListener('HIDE', this, this.hide);

		if (this.texture) {
			this.texture.dispose();
		}
		
        this.texture = null;
		this.dataLoaded = false;
		this.dataLoading = false;
		this.tile.removeExtensionDiffuse(this.id);
		this.tile = null;
		Renderer.MUST_RENDER = true;
	}
	
}