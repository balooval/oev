import Evt from '../utils/event.js';

let activesExtensions = [];
export const extensions = {};

export const evt = new Evt();

export function listActives() {
	return activesExtensions;
}

export function register(_id, _extension) {
	extensions[_id] = _extension;
}

export function activate(_extensionId) {
	activesExtensions.push(_extensionId);
	evt.fireEvent('TILE_EXTENSION_ACTIVATE', _extensionId);
}

export function desactivate(_extensionId) {
	activesExtensions = activesExtensions.filter(extId => extId != _extensionId);
	evt.fireEvent('TILE_EXTENSION_DESACTIVATE', _extensionId);
	evt.fireEvent('TILE_EXTENSION_DESACTIVATE_' + _extensionId);
}