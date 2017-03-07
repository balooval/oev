'use strict';

Oev.Tile.Extension = {
	
		id : '', 
		
		evt : new Oev.Utils.Evt(), 
		
		activateExtension : function(_extensionId) {
			console.log('activateExtension', _extensionId);
			Oev.Tile.Extension.evt.fireEvent('TILE_EXTENSION_ACTIVATE_' + _extensionId);
		}, 
		
		desactivateExtension : function(_extensionId) {
			console.log('desactivateExtension', _extensionId);
			Oev.Tile.Extension.evt.fireEvent('TILE_EXTENSION_DESACTIVATE_' + _extensionId);
		}, 
	
		onInit : function(_tile) {
			this.tile = _tile;
			if (Oev.Tile.Extension['ACTIV_' + this.id] === undefined) {
				Oev.Tile.Extension['ACTIV_' + this.id] = false;
			}
			Oev.Tile.Extension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_' + this.id, this, this.onActivate);
			Oev.Tile.Extension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE_' + this.id, this, this.onDesactivate);
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
			this.tile.evt.addEventListener('DISPOSE', this, this.onDispose);
			this.activate();
			if (this.tile.isReady) {
				this.onTileReady();
			}
		}, 
		
		onDesactivate : function() {
			Oev.Tile.Extension['ACTIV_' + this.id] = false;
			this.onHide();
			this.onDispose();
			this.desactivate();
		}, 
		
		onTileReady : function(_evt) {
			this.tileReady();
		}, 
		
		onShow : function() {
			this.show();
		}, 
		
		onHide : function() {
			this.hide();
		}, 
		
		onDispose : function() {
			this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
			this.tile.evt.removeEventListener('SHOW', this, this.onShow);
			this.tile.evt.removeEventListener('HIDE', this, this.onHide);
			this.tile.evt.removeEventListener('DISPOSE', this, this.onDispose);
			this.dispose();
		}, 
		
		/*		TO OVERRIDE	*/
		
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


// Oev.Tile.Extension['ACTIV_ELEVATION'] = true;