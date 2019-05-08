import Evt from '../utils/event.js';
import GLOBE from '../globe.js';

let activesExtensions = [];

export const evt = new Evt();

export function listActives() {
	return activesExtensions;
}

export function activateExtension(_extensionId) {
	activesExtensions.push(_extensionId);
	GLOBE.tilesBase.forEach(t => t.addExtension(_extensionId));
	evt.fireEvent('TILE_EXTENSION_ACTIVATE', _extensionId);
}

export function desactivateExtension(_extensionId) {
	activesExtensions = activesExtensions.filter(extId => extId != _extensionId);
	evt.fireEvent('TILE_EXTENSION_DESACTIVATE', _extensionId);
}

export {Elevation} from './elevation/elevationExtension.js';
export * from './building/buildingExtension.js';
export * from './map/mapExtension.js';
export * from './normal/normalExtension.js';
export * from './landuse/landuseExtension.js';