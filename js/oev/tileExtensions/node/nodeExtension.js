import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import * as NodeLoader from './nodeLoader.js';
import * as NET_MODELS from '../../net/NetModels.js';
import ElevationStore from '../elevation/elevationStore.js';

export {setApiUrl} from './nodeLoader.js';

export function extensionClass() {
	return NodeExtension;
}


class NodeExtension {
	constructor(_tile) {
		this.id = 'NODE';
		this.dataLoading = false;
        this.dataLoaded = false;
        this.tile = _tile;
        this.meshes = {};
        this.mesh = null;
        this.isActive = this.tile.zoom == 15;
		this.tile.evt.addEventListener('SHOW', this, this.onTileReady);
		this.tile.evt.addEventListener('DISPOSE', this, this.onTileDispose);
		this.tile.evt.addEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.addEventListener('HIDE', this, this.hide);

		if (this.tile.isReady) this.onTileReady();
    }

    onTileReady() {
		if (this.dataLoaded) return true;
        if (this.dataLoading) return false;
        if (!this.isActive) return false;
		this.dataLoading = true;
		NodeLoader.loader.getData({
                z : this.tile.zoom, 
                x : this.tile.tileX, 
                y : this.tile.tileY, 
                priority : this.tile.distToCam
            }, _datas => this.onNodesLoaded(_datas)
		);
    }
    
    onNodesLoaded(_datas) {
        if (!this.tile) return false;
		this.dataLoading = false;
		this.dataLoaded = true;
        if (!this.tile.isReady) return false;
        const parsedJson = JSON.parse(_datas);
        const nodes = prepareNodesDatas(parsedJson);
        if (!nodes.length) return false;
        this.drawNodes(nodes);
    }

    drawNodes(_nodes) {
        const typedGeometries = {};
        _nodes.forEach(node => {
            if (!typedGeometries[node.type]) typedGeometries[node.type] = [];
            const model = NET_MODELS.get(node.type).geometry.clone();
            applyTransformation(node, model);
            const elevation = ElevationStore.get(node.coord[0], node.coord[1]);
            const pos = GLOBE.coordToXYZ(
                node.coord[0], 
                node.coord[1], 
                elevation
            );
            const verticesBuffer = model.getAttribute('position');
            let verticeId = 0;
            let len = verticesBuffer.array.length / 3;
            for (let v = 0; v < len; v ++) {
                verticesBuffer.array[verticeId + 0] += pos.x;
                verticesBuffer.array[verticeId + 1] += pos.y;
                verticesBuffer.array[verticeId + 2] += pos.z;
                verticeId += 3;
            }
            typedGeometries[node.type].push(model)
        });
        Object.keys(typedGeometries).forEach(type => {
            const mergedGeometrie = THREE.BufferGeometryUtils.mergeBufferGeometries(typedGeometries[type]);
            this.meshes[type] = new THREE.Mesh(mergedGeometrie, modelsMaterials[type]);
            this.meshes[type].receiveShadow = true;
            this.meshes[type].castShadow = true;
            GLOBE.addMeshe(this.meshes[type]);
        });
    }

	onTileDispose() {
		this.dispose();
	}
	
	hide() {
		this.dataLoading = false;
		NodeLoader.loader.abort({
            z : this.tile.zoom, 
            x : this.tile.tileX, 
            y : this.tile.tileY
        });
    }
	
	dispose() {
        this.tile.evt.removeEventListener('SHOW', this, this.onTileReady);
        this.tile.evt.removeEventListener('TILE_READY', this, this.onTileReady);
        this.tile.evt.removeEventListener('HIDE', this, this.hide);
		this.tile.evt.removeEventListener('DISPOSE', this, this.onTileDispose);
        if (!this.isActive) return false;
        Object.keys(this.meshes).forEach(key => {
            this.meshes[key].geometry.dispose();
            GLOBE.removeMeshe(this.meshes[key]);
            delete this.meshes[key];
        });
        this.meshes = null;
        this.hide();
		this.dataLoaded = false;
        this.dataLoading = false;
        this.tile = null;
		Renderer.MUST_RENDER = true;
	}
}

function applyTransformation(_node, _geometrie) {
    const props = {
        tree : {

        }, 
    };
    if (_node.props.height) {
        const scale = _node.props.height / 5;
        _geometrie.scale(scale, scale, scale);
    }
    _geometrie.rotateY(Math.random() * 3.14);
}

function prepareNodesDatas(_datas) {
    const nodes = [];
    _datas.elements
    .filter(node => isTagSupported(node))
	.forEach(node => {
		nodes.push({
            id : node.id, 
            props : node.tags, 
            type : extractType(node), 
            coord : [
                parseFloat(node.lon), 
                parseFloat(node.lat)
            ], 
        });
    });
    return nodes;
}

function isTagSupported(_element) {
    if (extractType(_element)) return true;
	return false;
}

function extractType(_element) {
    let elementType = null;
    supportedTags.forEach(tag => {
        if (!_element.tags[tag.key]) return false;
        tag.values.forEach(value => {
            if (_element.tags[tag.key] == value) {
                elementType = value;
                return null;
            }
            return null;
        })
    })
    if (equalsTags[elementType]) return equalsTags[elementType];
	return elementType;
}

const modelsMaterials = {
    tower : new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0, color:0xdddddd, side:THREE.DoubleSide, transparent:true}), 
    bench : new THREE.MeshPhysicalMaterial({roughness:0.9,metalness:0, color:0x544d42, side:THREE.DoubleSide, transparent:true}), 
    tree : new THREE.MeshPhysicalMaterial({roughness:0.5,metalness:0, color:0x397717}), 
}

const equalsTags = {
    pole : 'tower', 
    waste_basket : 'recycling', 
    waste_disposal : 'recycling', 
};

const supportedTags = [
    {
        key : 'power', 
        values : [
            'tower', 
            'pole', 
        ]
    }, 
    
    {
        key : 'amenity', 
        values : [
            'bench', 
            // 'recycling', 
            // 'waste_basket', 
            // 'waste_disposal', 
        ], 
    }, 
    
    {
        key : 'natural', 
        values : [
            'tree', 
            // 'rock', 
        ], 
    }, 
];