let maxNb = 0;
const cacheGeometries = [];
let freeGeometryIndex = -1;

export function getGeometry() {
    // console.log('maxNb', maxNb);
    if (freeGeometryIndex < 0) return new THREE.BufferGeometry();
    const geometry = cacheGeometries[freeGeometryIndex];
    freeGeometryIndex --;
    return geometry;
}

export function storeGeometry(_geometry) {
    for (let name in _geometry.attributes) {
        _geometry.removeAttribute(name);
    }
    freeGeometryIndex ++;
    if (freeGeometryIndex > cacheGeometries.length - 1) {
        cacheGeometries.push(_geometry);
    } else {
        cacheGeometries[freeGeometryIndex] = _geometry;
    }
    maxNb = Math.max(maxNb, cacheGeometries.length);
}

export function storeGeometries(_geometries) {
    for (let i = 0; i < _geometries.length; i ++) {
        storeGeometry(_geometries[i]);
    }
}


let maxNbMeshes = 0;
const cachedMeshes = [];
let freeMeshesIndex = -1;

export function getMesh() {
    // console.log('maxNbMeshes', maxNbMeshes);
    if (freeMeshesIndex < 0) return new THREE.Mesh();
    const mesh = cachedMeshes[freeMeshesIndex];
    freeMeshesIndex --;
    return mesh;
}

export function storeMesh(_mesh) {
    freeMeshesIndex ++;
    if (freeMeshesIndex > cachedMeshes.length - 1) {
        cachedMeshes.push(_mesh);
    } else {
        cachedMeshes[freeMeshesIndex] = _mesh;
    }
    maxNbMeshes = Math.max(maxNbMeshes, cachedMeshes.length);
}