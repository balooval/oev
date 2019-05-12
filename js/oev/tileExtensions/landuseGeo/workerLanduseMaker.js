importScripts('../building/Earcut.js');
importScripts('../../../utils/simplify.js');

onmessage = function(_msg) {
	let landuses = _msg.data.landusesDatas;
	if (_msg.data.bbox) {
		landuses = landuses.filter(b => bboxContainCoord(_msg.data.bbox, b.centroid));
	}
	const simplification = {
		zoom_13 : 0.0001, 
		zoom_14 : 0.00005, 
		zoom_15 : 0.00001, 
	};
	landuses.forEach(b => {
		b.coords = simplify(b.coords, simplification['zoom_' + _msg.data.zoom], true);
	});
	landuses = landuses.filter(b => b.coords.length > 2);

	const wallsDatas = prepareWallsGeometry(landuses);
	const roofsDatas = prepareRoofsGeometry(landuses);
	postMessage({
		tileKey : _msg.data.tileKey, 
		result : {
			landuses : _msg.data.landusesDatas, 
			geometryWalls : wallsDatas, 
			geometryRoofs : roofsDatas, 
		}, 
	});
}

function prepareRoofsGeometry(_landuses) {
	let nbVert = 0;
	let nbFaces = 0;
    const roofFacesIndex = [];
    const floorNb = 1;
    const floorHeight = 10;
	for (let b = 0; b < _landuses.length; b ++) {
		const curLanduse = _landuses[b];
		curLanduse.nbVertRoof = curLanduse.coords.length - 1;
		nbVert += curLanduse.nbVertRoof;
		const roofCoords = curLanduse.coords.slice(0, -1).flat();
		const facesIndex = earcut(roofCoords);
		nbFaces += facesIndex.length;
		roofFacesIndex.push(facesIndex);
	}
	const bufferFaces = new Uint32Array(nbFaces);
	const bufferCoord = new Float32Array(nbVert * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	const colorVertices = [];
	for (let b = 0; b < _landuses.length; b ++) {
		const curLanduse = _landuses[b];
		const roofAlt = (floorNb * floorHeight)
		for (let f = 0; f < roofFacesIndex[b].length; f ++) {
			bufferFaces[bufferFaceIndex] = roofFacesIndex[b][f] + (bufferVertIndex / 3);
			bufferFaceIndex ++;
		}
		for (let v = 0; v < curLanduse.nbVertRoof; v ++) {
			bufferCoord[bufferVertIndex + 0] = curLanduse.coords[v][0];
			bufferCoord[bufferVertIndex + 1] = curLanduse.coords[v][1];
			bufferCoord[bufferVertIndex + 2] = roofAlt;
			bufferVertIndex += 3;
			colorVertices.push(...[120, 255, 100]);
		}
	}
	return {
		nbVert : nbVert, 
		nbFaces : nbFaces, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function prepareWallsGeometry(_landuses) {
	let nbVert = 0;
	let nbFaces = 0;
    const floorNb = 1;
    const floorHeight = 10;
	_landuses.forEach(b => {
		let landuseCoordNb = b.coords.length;
		b.nbVert = landuseCoordNb * (floorNb + 1)
		nbVert += b.nbVert;
		nbFaces += (landuseCoordNb * 2) * floorNb;
	});
	const bufferCoord = new Float32Array(nbVert * 3);
	const bufferFaces = new Uint32Array(nbFaces * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	let pastFaceNb = 0;
	const colorVertices = [];
	_landuses.forEach(landuse => {
		let landuseCoordNb = landuse.coords.length;
        fondationsLat = -10;
		for (let floor = 0; floor < floorNb + 1; floor ++) {
			for (let c = 0; c < landuseCoordNb; c ++) {
				colorVertices.push(...[100, 255, 80]);
				if (floor > 0) {
					const faceTopLeft = landuseCoordNb + c;
					const faceBottomLeft = c;
					let faceBottomRight = c + 1;
					let faceTopRight = faceBottomRight + landuseCoordNb;
					if (faceBottomRight >= landuseCoordNb) {
						faceBottomRight = 0;
						faceTopRight = landuseCoordNb;
					}
					const tmp = (floor - 1) * landuseCoordNb;
					bufferFaces[bufferFaceIndex + 0] = faceTopLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 1] = faceBottomLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 2] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 3] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 4] = faceTopRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 5] = faceTopLeft + pastFaceNb + tmp;
					bufferFaceIndex += 6;
				}
				bufferCoord[bufferVertIndex + 0] = landuse.coords[c][0];
				bufferCoord[bufferVertIndex + 1] = landuse.coords[c][1];
				bufferCoord[bufferVertIndex + 2] = fondationsLat + (floor * floorHeight);
				bufferVertIndex += 3;
			}
			fondationsLat = 0;
		}
		pastFaceNb += landuseCoordNb * (floorNb + 1);
	});

	return {
		nbVert : nbVert, 
		nbFaces : nbFaces, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}

function bboxContainCoord(_bbox, _coord) {
	if (_coord[0] < _bbox.minLon) return false;
	if (_coord[0] > _bbox.maxLon) return false;
	if (_coord[1] > _bbox.maxLat) return false;;
	if (_coord[1] < _bbox.minLat) return false;
	return true;
}