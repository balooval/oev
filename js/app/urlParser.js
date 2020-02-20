import GLOBE from '../oev/globe.js';
import {evt as TileExtensionEvt} from '../oev/tileExtensions/tileExtension.js';

let urlParams = {
    location : null, 
    extensions : [], 
};

const api = {

    init : function(_params, _startCamera) {
        urlParams.location = _startCamera;
        if (!_params.enabled) return;
        parseHash(location.hash);
        APP.evt.addEventListener('APP_INIT', null, onAppStart);
    }, 

    cameraLocation : function() {
        return urlParams.location;
    }, 

    activesExtensions : function() {
        return urlParams.extensions;
    }, 
};

function updateHash(_urlParams) {
    let hash = '';
    hash += 'location=' + _urlParams.location.z + '/' + _urlParams.location.x + '/' + _urlParams.location.y;
    if (_urlParams.extensions.length) {
        hash += '&extensions=' + _urlParams.extensions.map(extension => extension.toLowerCase()).join(',');
    }
    location.hash = hash;
}

function onAppStart() {
    APP.evt.removeEventListener('APP_INIT', null, onAppStart);
    TileExtensionEvt.addEventListener('TILE_EXTENSION_ACTIVATE', null, onExtensionActivate);
    TileExtensionEvt.addEventListener('TILE_EXTENSION_DESACTIVATE', null, onExtensionDesctivate);
    GLOBE.evt.addEventListener('READY', null, onGlobeReady);
}

function onGlobeReady() {
    GLOBE.evt.removeEventListener('READY', null, onGlobeReady);
    GLOBE.cameraControler.evt.addEventListener('CAM_UPDATED', null, onCameraUpdate);
}

function onExtensionActivate(_extension) {
    urlParams.extensions.push(_extension);
    updateHash(urlParams);
}

function onExtensionDesctivate(_extension) {
    urlParams.extensions = urlParams.extensions.filter(extension => _extension != extension);
    updateHash(urlParams);
}

function onCameraUpdate(_datas) {
    urlParams.location.x = _datas.coord.lon;
    urlParams.location.y = _datas.coord.lat;
    urlParams.location.z = _datas.coord.zoom;
    updateHash(urlParams);
}

function parseHash(_hash) {
    if (_hash == '') return null;
    const props = {};
    _hash
    .substring(1)
    .split('&')
    .map(token => token.split('='))
    .forEach(values => {
        props[values[0]] = values[1];
    });
    if (props.location) {
        const coords = props.location.split('/');
        props.location = {
            z : parseFloat(coords[0]), 
            x : parseFloat(coords[1]), 
            y : parseFloat(coords[2]), 
        }
    }
    if (props.extensions) {
        const extensions = props.extensions.split(',');
        props.extensions = extensions.map(extension => extension.toUpperCase());
    } else {
        props.extensions = [];
    }
    urlParams = props;
}

export {api as default};