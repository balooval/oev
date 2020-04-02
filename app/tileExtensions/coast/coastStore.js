import Evt from '../../core/event.js';
import * as CoastLoader from './coastLoader.js';
import PolygonClipping from '../../vendor/polygon-clipping.module.js';

const evt = new Evt();
const storedSatas = new Map();
const minZoom = 10;

function getDatas(_tile) {
    const key = getKey(_tile);
    if (storedSatas.has(key)) {
        evt.fireEvent('LOADED_' + key, {key:key, datas:storedSatas.get(key)});
        return;
    }
    if (_tile.zoom == minZoom) {
        loadDatas(_tile);
        return;
    }
    const parentKey = getKey(_tile.parentTile);
    const evtCbFn = function(_evt) {
        evt.removeEventListener('LOADED_' + parentKey, null, evtCbFn);
        const coastDatas = extractTileDatas(_tile, _evt.datas);
        storedSatas.set(key, coastDatas);
        evt.fireEvent('LOADED_' + key, {key:key, datas:coastDatas});
    };
    evt.addEventListener('LOADED_' + parentKey, null, evtCbFn);
    getDatas(_tile.parentTile);
}

function extractTileDatas(_tile, _parentDatas) {
    if (_parentDatas.length == 0) {
        return _parentDatas;
    }
    if (_parentDatas[0] == 'LAND') {
        return _parentDatas;
    }
    const tilePolygon = [
        [_tile.startCoord.x, _tile.endCoord.y], 
        [_tile.endCoord.x, _tile.endCoord.y], 
        [_tile.endCoord.x, _tile.startCoord.y], 
        [_tile.startCoord.x, _tile.startCoord.y], 
    ];
    const tileDatas = [];
    _parentDatas.forEach(polygon => {
        const results = PolygonClipping.intersection([tilePolygon], [polygon]);
        results.forEach(res => {
            tileDatas.push(res[0]);
        });
    });
    return tileDatas;
}

function loadDatas(_tile, _callback) {
    CoastLoader.loader.getData(
        {
            x : _tile.tileX, 
            y : _tile.tileY, 
            z : _tile.zoom, 
        }, 
        _datas => {
            const key = getKey(_tile);
            onDatasLoaded(key, _datas);
            if (_callback) _callback(key, _datas);
        }
    );
}
    
function onDatasLoaded(_key, _datas) {
    storedSatas.set(_key, _datas);
    evt.fireEvent('LOADED_' + _key, {key:_key, datas:_datas});
}

function getKey(_tile) {
    return _tile.tileX + '_' + _tile.tileY + '_' + _tile.zoom;
}

export {evt, getDatas, getKey};