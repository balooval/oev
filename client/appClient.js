import UI from './ui.js';
import UrlParser from './urlParser.js';
import OEV from '../app/app.js';

let params;

const APP = {

	init : function(_htmlContainer, _params = {}) {
		params = _params;
		OEV.init(_htmlContainer, _params.OEV, APP.onOevReady);
		UrlParser.init(OEV, OEV.params.URL, OEV.params.CAMERA);
		UI.init(OEV.params.UI);
	}, 
	
	onOevReady : function() {
		const cameraLocation = UrlParser.cameraLocation();
		const cameraCtrl = OEV.getCamera('GOD', cameraLocation);
		OEV.start(cameraCtrl);
		UI.setCamera(cameraCtrl);
		if (OEV.params.UI.waypoints) {
			params.waypoints.forEach(waypoint => OEV.saveWaypoint(waypoint.lon, waypoint.lat, waypoint.ele, waypoint.name));
		}
		UI.start();
		APP.render();
	}, 

	render : function() {
		if (OEV.hasChanged()) {
			const coord = OEV.getCoordLookAt();
			UI.showUICoords(coord.lon, coord.lat, coord.ele);
		}
		if (UI.dragSun) {
			const normalizedTime = OEV.getMouseNormalizedPosition();
			OEV.setTime(normalizedTime);	
		}
		OEV.update();
		requestAnimationFrame(APP.render);
	}, 

	gotoWaypoint : function(_waypointIndex) {
		const waypoint = OEV.getWaypoint(_waypointIndex);
		OEV.goto(waypoint);
	},  

};

window.APP = APP;