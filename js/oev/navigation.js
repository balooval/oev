import Renderer from './renderer.js';
import * as UI from './ui.js';
import * as NET_TEXTURES from './net/NetTextures.js';
import GLOBE from './globe.js';

let waypointMat;
const waypointsList = [];
let WpStored = [];

var api = {
	init : function() {
		OEV.evt.addEventListener('APP_START', api, api.onAppStart);
	}, 
	
	onAppStart : function() {
		waypointMat = new THREE.SpriteMaterial({map:NET_TEXTURES.texture('waypoint'), color:0xffffff, fog:false})
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
		const wp = new WayPoint( _lon, _lat, _zoom, _name);
		waypointsList.push(wp);
		UI.updateWaypointsList(waypointsList);
		if (_localStore) {
			WpStored.push({name : _name, lon : _lon, lat : _lat, zoom : _zoom});
			localStorage.setItem("waypoints", JSON.stringify(WpStored));
		}
		return wp;
	}, 
	
	removeWaypoint : function( _wId ) {
		WpStored = WpStored.filter(w => {
			if (w.lon != waypoints[_wId].lon) return true;
			if (w.lat != waypoints[_wId].lat) return true;
			if (w.zoom != waypoints[_wId].zoom) return true;
			return false;
		});
		localStorage.setItem("waypoints", JSON.stringify(WpStored));	
		waypoints[_wId].dispose();
		waypoints.splice(_wId, 1);
		updateWaypointsList(waypoints);
	}
};

class WayPoint {
	constructor(_lon, _lat,_zoom, _name) {
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
			var ele = GLOBE.getElevationAtCoords(this.lon, this.lat);
			var pos = GLOBE.coordToXYZ(_lon, _lat, ele);
			this.sprite.position.x = pos.x;
			this.sprite.position.y = pos.y;
			this.sprite.position.z = pos.z;
			var wpScale = (OEV.camCtrl.coordCam.z / GLOBE.radius) * 1000;
			this.sprite.scale.x = wpScale;
			this.sprite.scale.y = wpScale;
			this.sprite.scale.z = wpScale;
			Renderer.scene.add(this.sprite);
		}
	}

	updatePos() {
		if (this.showSprite) {
			var pos = GLOBE.coordToXYZ(this.lon, this.lat, (GLOBE.meter * 64) * GLOBE.globalScale);
			this.sprite.position.x = pos.x;
			this.sprite.position.y = pos.y;
			this.sprite.position.z = pos.z;
		}
	}

	resize(_scale) {
		if (this.showSprite) {
			this.sprite.scale.x = _scale;
			this.sprite.scale.y = _scale;
			this.sprite.scale.z = _scale;
		}
	}

	hide(_state) {
		if (this.showSprite){
			if (this.onStage && _state){
				this.onStage = false;
				Renderer.scene.remove(this.sprite);
			}else if (!this.onStage && !_state) {
				this.onStage = true;
				Renderer.scene.add(this.sprite);
			}
		}
	}

	dispose() {
		if( this.showSprite ){
			Renderer.scene.remove(this.sprite);
		}
	}
};

export { api as default}