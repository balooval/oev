'use strict';

Oev.Tile.Extension = {
	
		id : '', 
		
		activated : [], 
		
		isInit : false, 
		
		isInstancied : false, 
		
		evt : new Oev.Utils.Evt(),
		
		activateExtension : function(_extensionId) {
			console.log('activateExtension', _extensionId);
			
			Oev.Tile.Extension.activated.push(_extensionId);
			
			for (var i = 0; i < Oev.Globe.tilesBase.length; i ++) {
				Oev.Globe.tilesBase[i].addExtension(_extensionId);
			}
			Oev.Tile.Extension.evt.fireEvent('TILE_EXTENSION_ACTIVATE', _extensionId);
			
			Oev.Tile.Extension.evt.fireEvent('TILE_EXTENSION_ACTIVATE_' + _extensionId);
		}, 
		
		desactivateExtension : function(_extensionId) {
			console.log('desactivateExtension', _extensionId);
			
			for (var i = 0; i < Oev.Tile.Extension.activated.length; i ++) {
				if (Oev.Tile.Extension.activated[i] == _extensionId) {
					Oev.Tile.Extension.activated.splice(i, 1);
					// console.log('Ok remove from activated');
					break;
				}
			}
			Oev.Tile.Extension.evt.fireEvent('TILE_EXTENSION_DESACTIVATE_' + _extensionId);
			if (_extensionId == 'LANDUSE') {
				console.warn('CLEAR tilesLandusesMng');
				OEV.earth.tilesLandusesMng.clearAll();
			}
			for (var i = 0; i < Oev.Globe.tilesBase.length; i ++) {
				Oev.Globe.tilesBase[i].removeExtension(_extensionId);
			}
		}, 
	
		onInit : function(_tile) {
			this.tile = _tile;
			this.isInit = true;
			if (Oev.Tile.Extension['ACTIV_' + this.id] === undefined) {
				Oev.Tile.Extension['ACTIV_' + this.id] = false;
			}
			Oev.Tile.Extension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
			Oev.Tile.Extension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
			this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
			if (Oev.Tile.Extension['ACTIV_' + this.id]) {
				this.onActivate();
			}
			this.init();
		}, 
		
		onActivate : function() {
			Oev.Tile.Extension['ACTIV_' + this.id] = true;
			this.dataLoaded = false;
			this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
			this.tile.evt.addEventListener('SHOW', this, this.onShow);
			this.tile.evt.addEventListener('HIDE', this, this.onHide);
			this.activate();
			if (this.tile.isReady) {
				this.onTileReady();
			}
		}, 
		
		onDesactivate : function() {
			Oev.Tile.Extension['ACTIV_' + this.id] = false;
			this.onHide();
			this.desactivate();
			this.tile.evt.removeEventListener('SHOW', this, this.onShow);
		}, 
		
		onTileReady : function(_evt) {
			this.isInstancied = true;
			this.tileReady();
		}, 
		
		onShow : function() {
			this.show();
		}, 
		
		onHide : function() {
			this.hide();
		}, 
		
		onTileDispose : function() {
			if (Oev.Tile.Extension['ACTIV_' + this.id] === true) {
				this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
				this.tile.evt.removeEventListener('SHOW', this, this.onShow);
				this.tile.evt.removeEventListener('HIDE', this, this.onHide);
			}
			this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
			Oev.Tile.Extension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
			Oev.Tile.Extension.evt.removeEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
			this.onDispose();
		}, 
		
		onDispose : function() {
			this.dispose();
			this.isInstancied = false;
			this.isInit = false;
		}, 
		
		/*		TO OVERRIDE		*/
		
		init : function() {
			
		}, 
		
		tileReady : function() {
			
		}, 
		
		activate : function() {
			
		}, 
		
		desactivate : function() {
			
		}, 
		
		show : function() {
			
		}, 
		
		hide : function() {
		
		}, 
		
		dispose : function() {
			
		}, 
};

Oev.Tile.Extension['ACTIV_ELEVATION'] = true;