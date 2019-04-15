import * as Textures from './NetTextures.js';
import * as Models from './NetModels.js';

export function init() {
	OEV.evt.addEventListener('APP_INIT', null, onAppInit);
	// OEV.evt.addEventListener('APP_START', api, api.onAppStart);
}

export function onAppInit() {
	Textures.onAppInit();
	Models.onAppInit();
}