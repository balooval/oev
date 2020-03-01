import * as THREE from '../../vendor/three.module.js';
import Renderer from '../renderer.js';
import GLOBE from '../core/globe.js';
import * as Animation from './animation.js';
import ElevationStore from '../tileExtensions/elevation/elevationStore.js';
import LinesModel from '../tileExtensions/lines/linesModels.js';
import LinesMaterial from '../tileExtensions/lines/linesMaterial.js';

const graphNodes = [];
const vehicles = [];
let vehicleGeometry;

LinesModel.evt.addEventListener('READY', null, onModelsReady);

function onModelsReady() {
    vehicleGeometry = LinesModel.get('vehicle');
}

const api = {
    
    build : function(_ways, _nodesList) {
        for (let i = 0; i < _ways.length; i ++) {
            extractWayNodes(_ways[i], _nodesList);
        }
        for (let i = 0; i < _ways.length; i ++) {
            let startNode = getRandomNode();
            vehicles.push(new Vehicle(startNode));
        }
    }, 

    cleanTile : function(_tile) 
    {
        const bbox = {
            minLon : _tile.startCoord.x, 
            maxLon : _tile.endCoord.x, 
            minLat : _tile.endCoord.y, 
            maxLat : _tile.startCoord.y, 
        };
        const vehiclesCopy = [...vehicles];
        for (let i = 0; i < vehiclesCopy.length; i ++) {
            const vehicle = vehiclesCopy[i];
            if (vehicle.isInBBox(bbox)) {
                deleteVehicle(vehicle);
            }
        }
    }, 

};

function deleteVehicle(_vehicle) {
    _vehicle.dispose();
    const index = vehicles.indexOf(_vehicle);
    vehicles.splice(index, 1);
}

function getRandomNode() {
    const index = Math.floor(Math.random() * (graphNodes.length));
    return graphNodes[index];
}

function getNodeById(_nodeId) {
    for (let i = 0; i < graphNodes.length; i ++) {
        if (graphNodes[i].id == _nodeId) return graphNodes[i];
    }
}

function extractWayNodes(_way, _nodesList) {
    let lastNode = null;
    if (!_way.tags.highway) return false;
    // console.log('_way.tags.highway', _way.tags.highway);
    const highwayType = getHighwayPriority(_way.tags.highway);
    for (let i = 0; i < _way.nodes.length; i ++) {
        const nodeId = _way.nodes[i];
        let node = getNodeById(nodeId);
        if (node) {
            node.setType(highwayType);
            node.addNeighbour(lastNode);
        } else {
            const nodeCoords = _nodesList.get('NODE_' + nodeId);
            node = new Node(nodeId, nodeCoords, highwayType);
            node.addNeighbour(lastNode);
            graphNodes.push(node);
        }
        if (lastNode) {
            lastNode.addNeighbour(node);
        }
        lastNode = node;
    }
}

function getHighwayPriority(_type) {
    const values = {
        trunk : 12, 
        trunk_link : 12, 
        motorway : 11, 
        motorway_link : 11, 
        primary : 10, 
        primary_link : 10, 
        secondary : 9, 
        secondary_link : 9, 
        tertiary : 8, 
        tertiary_link : 8, 
        road : 7, 
        unclassified : 7, 
        residential : 6, 
        service : 5, 
        living_street : 4, 
        pedestrian : 4, 
    };
    if (!values[_type]) {
        console.log('Type not handled', _type);
        return 5;
    }
    return values[_type];
}

class Node {
    constructor(_id, _coords, _type) {
        this.id = _id;
        this.type = _type;
        this.coords = _coords;
        this.neighbours = [];
        this.neighboursDist = [];
    }

    setType(_type) {
        this.type = Math.max(this.type, _type);
    }

    addNeighbour(_node) {
        if (_node === null) return;
        this.neighbours.push(_node);
        const distance = this.distanceToNode(_node);
        this.neighboursDist.push(distance);
    }

    distanceToNode(_node) {
        const distLon = Math.abs(this.coords[0] - _node.coords[0]);
        const distLat = Math.abs(this.coords[1] - _node.coords[1]);
        return distLon + distLat;
    }

    getNeighbours() {
        return {
            nodes : this.neighbours, 
            distances : this.neighboursDist, 
        }
    }
}



class Vehicle {
    constructor(_startNode) {
        this.startNode = _startNode;
        this.pastNodes = [];
        this.tweens = {
            lon : new Animation.TweenValue(this.startNode.coords[0]), 
			lat : new Animation.TweenValue(this.startNode.coords[1]), 
			angle : new Animation.TweenValue(0), 
        };
        this.tweens.lon.evt.addEventListener('END', this, this.getNextDest);
        this.mesh = new THREE.Mesh(vehicleGeometry, LinesMaterial.material('vehicle'));
        GLOBE.addMeshe(this.mesh);
        this.getNextDest();
        GLOBE.addObjToUpdate(this);
    }

    isInBBox(_bbox) {
        if (this.startNode.coords[0] < _bbox.minLon) return false;
        if (this.startNode.coords[0] > _bbox.maxLon) return false;
        if (this.startNode.coords[1] < _bbox.minLat) return false;
        if (this.startNode.coords[1] > _bbox.maxLat) return false;
        return true;
    }

    getNextDest() {
        const neighbour = this.getNextNode();
        const timeToTravel = (neighbour.distance * 50000) / neighbour.node.type;
        this.tweens.lon.value = this.startNode.coords[0];
        this.tweens.lat.value = this.startNode.coords[1];
        this.tweens.lon.setTargetValue(neighbour.node.coords[0], timeToTravel * 1000);
        this.tweens.lat.setTargetValue(neighbour.node.coords[1], timeToTravel * 1000);
        this.storePastNode(this.startNode);
        const angle = Math.atan2(
            this.startNode.coords[0] - neighbour.node.coords[0], 
            this.startNode.coords[1] - neighbour.node.coords[1]
        );
        // this.mesh.rotation.y = angle;// + Math.PI / 2;
        this.tweens.angle.setTargetValue(angle, 500);
        this.startNode = neighbour.node;
    }

    getNextNode() {
        const neighbours = this.startNode.getNeighbours();
        const nodesScores = [];
        neighbours.nodes.forEach((n, i) => {
            let score = 100 + (Math.random() * 20);
            const pastIndex = this.pastNodes.indexOf(n);
            if (pastIndex >= 0) score = pastIndex;
            score += n.type * 2;
            nodesScores.push({
                score : score, 
                node : n, 
                distance : neighbours.distances[i], 
            });
        });
        return nodesScores.sort((a, b) => a.score - b.score).pop();
    }
    
    storePastNode(_node) {
        this.pastNodes.unshift(_node);
        if (this.pastNodes.length > 50) this.pastNodes.pop();
    }

    getCurCoord() {
        const d = new Date();
        const curTime = d.getTime();
        return {
            lon : this.tweens.lon.getValueAtTime(curTime), 
            lat : this.tweens.lat.getValueAtTime(curTime), 
            angle : this.tweens.angle.getValueAtTime(curTime), 
        };
    }

    update() {
        const curCoord = this.getCurCoord();
        const elevation = ElevationStore.get(curCoord.lon, curCoord.lat);
        const pos = GLOBE.coordToXYZ(
            curCoord.lon, 
            curCoord.lat, 
            elevation, 
        );
        this.mesh.position.x = pos.x;
        this.mesh.position.y = pos.y;
        this.mesh.position.z = pos.z;
        this.mesh.rotation.y = curCoord.angle;
        Renderer.MUST_RENDER = true;
    }

    dispose() {
        this.tweens.lon.evt.removeEventListener('END', this, this.getNextDest);
        GLOBE.removeMeshe(this.mesh);
        GLOBE.removeObjToUpdate(this);
        this.mesh.geometry.dispose();
    }
}






export {api as default};