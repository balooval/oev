import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import MATH from '../../utils/math.js';
import Evt from '../../utils/event.js';
import * as Animation from '../../utils/animation.js';
import * as TileExtension from '../tileExtension.js';
import PlaneModels from './planeModels.js';
import PlaneMaterial from './planeMaterial.js';

let knowIds = [];
const storedPlanes = new Map();

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension);

function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_PLANE', null, onActivateExtension);
    setTimeout(() => clearOldPlanes(), 20000);
}

function clearOldPlanes() {
    const d = new Date();
    const curTime = d.getTime() / 1000;
    storedPlanes.forEach((plane, id) => {
        const planeTime = plane.lastPositionTime();
        if (curTime - planeTime < 30) return;
        deletePlane(id);
    });
    console.log('Plane NB', storedPlanes.size);
    setTimeout(() => clearOldPlanes(), 20000);
}

const api = {
    evt : new Evt(), 

    setDatas : function(_json, _tile) {
        const parsedJson = JSON.parse(_json);
        if (!parsedJson.states) return null;
        const planes = extractPlanes(parsedJson.states);
        registerDatas(planes);
    }, 

    getPlane(_planeId) {
        return storedPlanes.get(_planeId);
    }, 

    tileRemoved : function(_tile) {
        const bbox = {
            minLon : _tile.startCoord.x, 
            maxLon : _tile.endCoord.x, 
            minLat : _tile.endCoord.y, 
            maxLat : _tile.startCoord.y, 
        };
        storedPlanes.forEach((plane, id) => {
            if (!plane.isInBBox(bbox)) return;
            deletePlane(id);
        });
    }
};

function deletePlane(_planeId) {
    const plane = storedPlanes.get(_planeId);
    plane.dispose();
    storedPlanes.delete(_planeId);
    api.evt.fireEvent('PLANE_DELETE', _planeId);
}

function registerDatas(_planes) {
    for (let i = 0; i < _planes.length; i ++) {
        const planeDatas = _planes[i];
        if (storedPlanes.has(planeDatas.id)) {
            // console.log('DEJA', planeDatas, storedPlanes.get(planeDatas.id));
            storedPlanes.get(planeDatas.id).updateProps(planeDatas);
            continue;
        }
        const plane = new Plane(planeDatas);
        plane.buildMesh();
        storedPlanes.set(planeDatas.id, plane);
        api.evt.fireEvent('PLANE_ADD', planeDatas.id);
    }
}

function extractPlanes(_states) {
    const planes = new Array(_states.length);
    for (let i = 0; i < _states.length; i ++) {
        const planeDatas = _states[i];
        planes[i] = {
            id : planeDatas[0], 
            timePosition : planeDatas[3], 
            lon : planeDatas[5], 
            lat : planeDatas[6], 
            alt : planeDatas[7] || 1000, 
            onGround : planeDatas[8], 
            horizontalSpeed : planeDatas[9], 
            angle : planeDatas[10], 
            verticalSpeed : planeDatas[11], 
        };
    }
    return planes;
}

class Plane {
    constructor(_props) {
        this.props = _props;
        this.mesh = undefined;
        this.tweens = {
			lon : new Animation.TweenValue(this.props.lon), 
			lat : new Animation.TweenValue(this.props.lat), 
			alt : new Animation.TweenValue(this.props.alt), 
		};
    }

    getCurCoord() {
        const d = new Date();
        const curTime = d.getTime();
        if (this.tweens.lon.getValueAtTime(curTime) != 0) {
            // console.log('RUN', this.props.id);
            return {
                lon : this.tweens.lon.getValueAtTime(curTime), 
                lat : this.tweens.lat.getValueAtTime(curTime), 
                alt : this.tweens.alt.getValueAtTime(curTime), 
            };
        }
        // console.log('STOP', this.props.id);
        return {
            lon : this.props.lon, 
            lat : this.props.lat, 
            alt : this.props.alt, 
        };
    }

    lastPositionTime() {
        return this.props.timePosition;
    }

    isInBBox(_bbox) {
        if (this.props.lon < _bbox.minLon) return false;
        if (this.props.lon > _bbox.maxLon) return false;
        if (this.props.lat < _bbox.minLat) return false;
        if (this.props.lat > _bbox.maxLat) return false;
        return true;
    }

    updateProps(_props) {
        if (_props.timePosition < this.props.timePosition) return false;
        const timeDiff = _props.timePosition - this.props.timePosition;

        this.tweens.lon.value = this.props.lon;
        this.tweens.lat.value = this.props.lat;
        this.tweens.alt.value = this.props.alt;

        this.tweens.lon.setTargetValue(_props.lon, timeDiff * 1000);
        this.tweens.lat.setTargetValue(_props.lat, timeDiff * 1000);
        this.tweens.alt.setTargetValue(_props.alt, timeDiff * 1000);

        this.props = _props;
    }

    buildMesh() {
        this.mesh = new THREE.Mesh(
            PlaneModels.get('plane'), 
            PlaneMaterial.material()
        );
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.placeMesh();
        GLOBE.addMeshe(this.mesh);
        GLOBE.addObjToUpdate(this);
    }

    update() {
        this.placeMesh();
    }

    placeMesh() {
        const curCoord = this.getCurCoord();
        const pos = GLOBE.coordToXYZ(
            curCoord.lon, 
            curCoord.lat, 
            curCoord.alt, 
        );
        this.mesh.position.x = pos.x;
        this.mesh.position.y = pos.y;
        this.mesh.position.z = pos.z;
        this.mesh.rotation.y = MATH.radians(this.props.angle + 180);
        Renderer.MUST_RENDER = true;
    }

    dispose() {
        GLOBE.removeMeshe(this.mesh);
        GLOBE.removeObjToUpdate(this);
        this.mesh.geometry.dispose();
    }
}

export {api as default};