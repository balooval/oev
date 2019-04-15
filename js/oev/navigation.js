import * as OLD_UI from '../UI.js';

var waypointMat;
var waypointsList = [];
var WpStored = [];

var api = {
	init : function() {
		OEV.evt.addEventListener('APP_START', api, api.onAppStart);
	}, 
	
	onAppStart : function() {
		waypointMat = new THREE.SpriteMaterial({map:OEV.textures['waypoint'], color:0xffffff, fog:false})
		if (localStorage.getItem("waypoints") == undefined) {
			localStorage.setItem("waypoints", JSON.stringify(WpStored));
		}else{
			WpStored = JSON.parse(localStorage.getItem("waypoints"));
			for(var w = 0; w < WpStored.length; w ++) {
				api.saveWaypoint(WpStored[w]["lon"],WpStored[w]["lat"], WpStored[w]["zoom"], WpStored[w]["name"]);
				
			}
		}
	}, 
	
	getWaypointById : function(_index) {
		return waypointsList[_index];
	}, 
	
	saveWaypoint : function(_lon, _lat, _zoom, _name, _localStore) {
		_name = _name || "WP " + waypointsList.length;
		_localStore = _localStore || false;
		var wp = new api.WayPoint( _lon, _lat, _zoom, _name);
		waypointsList.push(wp);
		OLD_UI.updateWaypointsList(waypointsList);
		if (_localStore) {
			WpStored.push({name : _name, lon : _lon, lat : _lat, zoom : _zoom});
			localStorage.setItem("waypoints", JSON.stringify(WpStored));
		}
		return wp;
	}, 
	
	removeWaypoint : function( _wId ) {
		for (var w = 0; w < WpStored.length; w ++) {
			var storedWP = WpStored[w];
			if (storedWP["lon"] == waypoints[_wId].lon && storedWP["lat"] == waypoints[_wId].lat && storedWP["zoom"] == waypoints[_wId].zoom) {
				WpStored.splice(w, 1);
				break;
			}
		}
		localStorage.setItem("waypoints", JSON.stringify(WpStored));	
		waypoints[_wId].dispose();
		waypoints.splice(_wId, 1);
		updateWaypointsList(waypoints);
	}
};


api.WayPoint = function (_lon, _lat,_zoom, _name) {
	this.showSprite = true;
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
		this.material = waypointMat;
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

export { api as default}