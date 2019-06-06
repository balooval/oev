import GLOBE from '../oev/globe.js';
import * as TileExtension from '../oev/tileExtensions/tileExtension.js';
import PlaneStore from '../oev/tileExtensions/plane/planeStore.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onPlaneActivation);
TileExtension.evt.addEventListener('TILE_EXTENSION_DESACTIVATE_PLANE', null, onPlaneDesactivation);
PlaneStore.evt.addEventListener('PLANE_ADD', null, onPlaneAdded);
PlaneStore.evt.addEventListener('PLANE_DELETE', null, onPlaneDeleted);

let uiElmt;

const api = {

	init : function() {
		uiElmt = document.getElementById('overlayExtensionsUi');
	}, 
		
};

function onBtnPlaneClick(_evt) {
    const planeId = _evt.target.dataset.plane_id;
    const plane = PlaneStore.getPlane(planeId);
    console.log('plane', plane);
    const planeCoord = plane.getCurCoord();
    console.log('planeCoord', planeCoord);
    GLOBE.cameraControler.setDestination(planeCoord.lon, planeCoord.lat, 13);
}

function addPlaneButton(_planeId) {
    const btnElmt = document.createElement('div');
    btnElmt.id = 'btn-plane-' + _planeId;
    btnElmt.dataset.plane_id = _planeId;
    btnElmt.classList.add('btn-plane');
    // btnElmt.innerHTML = _planeId;
    btnElmt.title = 'Plane ' + _planeId;
    btnElmt.addEventListener('click', onBtnPlaneClick);
    uiElmt.appendChild(btnElmt);
}

function removePlaneButton(_planeId) {
    const btnElmt = document.getElementById('btn-plane-' + _planeId);
    btnElmt.removeEventListener('click', onBtnPlaneClick);
    btnElmt.remove();
}

function onPlaneActivation() {
    
}

function onPlaneDesactivation() {
    
}

function onPlaneAdded(_planeId) {
    addPlaneButton(_planeId);
}

function onPlaneDeleted(_planeId) {
    removePlaneButton(_planeId);
}

export {api as default}