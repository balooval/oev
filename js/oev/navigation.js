Oev.Navigation = (function(){
	'use strict';
	var api = {
		
	};
	
	api.WayPoint = function (_lon, _lat,_zoom, _name, _textureName) {
		_textureName = _textureName || 'default';
		this.showSprite = true;
		if (_textureName == 'none'){ // don't show on the map
			this.showSprite = false;
		}else if (!OEV.materialWaypoints[_textureName]) {
			_textureName = 'default';
		}
		this.showList = true;
		if (_name == "none") {
			this.showList = false;
		}
		this.lon = _lon;
		this.lat = _lat;
		this.zoom = _zoom;
		this.name = _name;
		this.onStage = true;
		this.sprite = undefined;
		this.material = undefined;
		if (this.showSprite) {
			this.material = OEV.materialWaypoints[_textureName];
			this.sprite = new THREE.Sprite(this.material);
			var ele = OEV.earth.getElevationAtCoords(this.lon, this.lat);
			var pos = OEV.earth.coordToXYZ(_lon, _lat, ele);
			this.sprite.position.x = pos.x;
			this.sprite.position.y = pos.y;
			this.sprite.position.z = pos.z;
			var wpScale = (OEV.camCtrl.coordCam.z / OEV.earth.radius) * 1000;
			this.sprite.scale.x = wpScale;
			this.sprite.scale.y = wpScale;
			this.sprite.scale.z = wpScale;
			OEV.scene.add(this.sprite);
		}
	}
	
	api.WayPoint.prototype = {
		updatePos : function() {
			if (this.showSprite) {
				var pos = OEV.earth.coordToXYZ(this.lon, this.lat, (OEV.earth.meter * 64) * OEV.earth.globalScale);
				this.sprite.position.x = pos.x;
				this.sprite.position.y = pos.y;
				this.sprite.position.z = pos.z;
			}
		}, 

		resize : function(_scale) {
			if (this.showSprite) {
				this.sprite.scale.x = _scale;
				this.sprite.scale.y = _scale;
				this.sprite.scale.z = _scale;
			}
		}, 

		hide : function(_state) {
			if (this.showSprite){
				if (this.onStage && _state){
					this.onStage = false;
					OEV.scene.remove(this.sprite);
				}else if (!this.onStage && !_state) {
					this.onStage = true;
					OEV.scene.add(this.sprite);
				}
			}
		}, 

		dispose : function() {
			if( this.showSprite ){
				OEV.scene.remove(this.sprite);
			}
		}, 
	};
	
	return api;
})();

