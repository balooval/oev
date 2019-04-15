import Evt from '../event.js';
import GLOBE from '../globe.js';

export const evt = new Evt();

export const Params = {
	activated : [], 
	actives : {}, 
};

export function activateExtension(_extensionId) {
	console.log('activateExtension', _extensionId);
	
	Params.activated.push(_extensionId);
	
	for (var i = 0; i < GLOBE.tilesBase.length; i ++) {
		GLOBE.tilesBase[i].addExtension(_extensionId);
	}
	evt.fireEvent('TILE_EXTENSION_ACTIVATE', _extensionId);
	
	evt.fireEvent('TILE_EXTENSION_ACTIVATE_' + _extensionId);
}

export function desactivateExtension(_extensionId) {
	console.log('desactivateExtension', _extensionId);
	
	for (var i = 0; i < Params.activated.length; i ++) {
		if (Params.activated[i] == _extensionId) {
			Params.activated.splice(i, 1);
			// console.log('Ok remove from activated');
			break;
		}
	}
	evt.fireEvent('TILE_EXTENSION_DESACTIVATE_' + _extensionId);
	if (_extensionId == 'LANDUSE') {
		console.warn('CLEAR tilesLandusesMng');
		OEV.earth.tilesLandusesMng.clearAll();
	}
	for (var i = 0; i < GLOBE.tilesBase.length; i ++) {
		GLOBE.tilesBase[i].removeExtension(_extensionId);
	}
}

export class DefaultExt {

	constructor() {
		this.id = '';
		this.isInit = false;
		isInstancied = false;
	}

	onInit(_tile) {
		this.tile = _tile;
		this.isInit = true;
		if (Params.actives['ACTIV_' + this.id] === undefined) {
			Params.actives['ACTIV_' + this.id] = false;
		}
		evt.addEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		if (Params.actives['ACTIV_' + this.id]) {
			this.onActivate();
		}
		this.init();
	}
	
	onActivate() {
		Params.actives['ACTIV_' + this.id] = true;
		this.dataLoaded = false;
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
		this.tile.evt.addEventListener('SHOW', this, this.onShow);
		this.tile.evt.addEventListener('HIDE', this, this.onHide);
		this.activate();
		if (this.tile.isReady) {
			this.onTileReady();
		}
	}
	
	onDesactivate() {
		Params.actives['ACTIV_' + this.id] = false;
		this.onHide();
		this.desactivate();
		this.tile.evt.removeEventListener('SHOW', this, this.onShow);
	}
	
	onTileReady(_evt) {
		this.isInstancied = true;
		this.tileReady();
	}
	
	onShow() {
		this.show();
	}
	
	onHide() {
		this.hide();
	}
	
	onTileDispose() {
		if (Params.actives['ACTIV_' + this.id] === true) {
			this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
			this.tile.evt.removeEventListener('SHOW', this, this.onShow);
			this.tile.evt.removeEventListener('HIDE', this, this.onHide);
		}
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
		evt.removeEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
		evt.removeEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
		this.onDispose();
	}
	
	onDispose() {
		this.dispose();
		this.isInstancied = false;
		this.isInit = false;
	}
	
	/*		TO OVERRIDE		*/
	
	init() {
		
	}
	
	tileReady() {
		
	}
	
	activate() {
		
	}
	
	desactivate() {
		
	}
	
	show() {
		
	}
	
	hide() {
	
	}
	
	dispose() {
		
	}
}


Params.actives['ACTIV_ELEVATION'] = true;

export {Elevation} from './tileExtElevation.js';