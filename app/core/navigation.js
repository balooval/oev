import * as THREE from '../vendor/three.module.js';
import Renderer from '../core/renderer.js';
import Evt from '../core/event.js';
import {texture as Texture} from '../net/textures.js';
import GLOBE from '../core/globe.js';

let waypointMat;
const waypointsList = [];
let wpStored = [];

var api = {
	evt : null, 

	init : function() {
		api.evt = new Evt();
		GLOBE.evt.addEventListener('READY', api, api.onAppStart);
	}, 
	
	onAppStart : function() {
		GLOBE.evt.removeEventListener('READY', api, api.onAppStart);
		waypointMat = new THREE.SpriteMaterial({map:Texture('waypoint'), color:0xffffff, fog:false})
		if (localStorage.getItem('waypoints') == undefined) {
			localStorage.setItem('waypoints', JSON.stringify(wpStored));
		}else{
			wpStored = JSON.parse(localStorage.getItem('waypoints'));
			wpStored.forEach(waypoint => {
				api.saveWaypoint(waypoint.lon, waypoint.lat, waypoint.zoom, waypoint.name);
			});
		}
	}, 

	waypoints : function() {
		return waypointsList;
	}, 
	
	getWaypointById : function(_index) {
		return waypointsList[_index];
	}, 
	
	saveWaypoint : function(_lon, _lat, _zoom, _name, _localStore = false) {
		_name = _name || 'WP ' + waypointsList.length;
		const wp = new WayPoint(_lon, _lat, _zoom, _name);
		waypointsList.push(wp);
		api.evt.fireEvent('WAYPOINT_ADDED', waypointsList)
		// UI.updateWaypointsList(waypointsList);
		if (_localStore) {
			wpStored.push({name : _name, lon : _lon, lat : _lat, zoom : _zoom});
			localStorage.setItem("waypoints", JSON.stringify(wpStored));
		}
		return wp;
	}, 
	
	removeWaypoint : function( _wId ) {
		wpStored = wpStored.filter(w => {
			if (w.lon != waypoints[_wId].lon) return true;
			if (w.lat != waypoints[_wId].lat) return true;
			if (w.zoom != waypoints[_wId].zoom) return true;
			return false;
		});
		localStorage.setItem("waypoints", JSON.stringify(wpStored));	
		waypoints[_wId].dispose();
		waypoints.splice(_wId, 1);
		updateWaypointsList(waypoints);
	}
};

class WayPoint {
	constructor(_lon, _lat,_zoom, _name) {
		this.showSprite = true;
		this.showList = true;
		if (_name == 'none') {
			this.showList = false;
		}
		this.lon = _lon;
		this.lat = _lat;
		this.zoom = _zoom;
		this.name = _name;
		this.onStage = true;
		this.sprite = undefined;
		this.material = undefined;
		if (this.showSprite) this.addToScene();
	}

	addToScene() {
		this.material = waypointMat;
		this.sprite = new THREE.Sprite(this.material);
		var ele = GLOBE.getElevationAtCoords(this.lon, this.lat, true);
		var pos = GLOBE.coordToXYZ(this.lon, this.lat, ele);
		this.sprite.position.x = pos.x;
		this.sprite.position.y = pos.y;
		this.sprite.position.z = pos.z;
		let wpScale = (GLOBE.cameraControler.coordCam.z / GLOBE.radius) * 1000;
		wpScale = Math.max(wpScale, 1);
		this.sprite.scale.x = wpScale;
		this.sprite.scale.y = wpScale;
		this.sprite.scale.z = wpScale;
		Renderer.scene.add(this.sprite);
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
		if (!this.showSprite) return true;
		if (this.onStage && _state){
			this.onStage = false;
			Renderer.scene.remove(this.sprite);
		} else if (!this.onStage && !_state) {
			this.onStage = true;
			Renderer.scene.add(this.sprite);
		}
	}

	dispose() {
		if (this.showSprite) {
			Renderer.scene.remove(this.sprite);
		}
	}
};

export { api as default}