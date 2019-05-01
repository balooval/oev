onmessage = function(_evt) {
	const result = prepareBuildingGeometry(_evt.data.buildingsDatas, _evt.data.bbox);
	postMessage({
		tileKey : _evt.data.tileKey, 
		result : {
			buildings : _evt.data.buildingsDatas, 
			geometry : result, 
		}, 
	});
}

function bboxContainCoord(_bbox, _coord) {
	if (_coord[0] < _bbox.minLon) return false;
	if (_coord[0] > _bbox.maxLon) return false;
	if (_coord[1] > _bbox.maxLat) return false;;
	if (_coord[1] < _bbox.minLat) return false;
	return true;
}

function prepareBuildingGeometry(_buildings, _bbox) {
	let nbVert = 0;
	let nbFaces = 0;

	if (_bbox) {
		_buildings = _buildings.filter(b => bboxContainCoord(_bbox, b.centroid));
	}

	_buildings.forEach(b => {
		let buildingCoordNb = b.nodes.length / 2;
		b.nbVert = buildingCoordNb * (b.props.floorsNb + 1)
		nbVert += b.nbVert;
		nbFaces += (buildingCoordNb * 2) * b.props.floorsNb;
	});
	const bufferCoord = new Float32Array(nbVert * 3);
	const bufferFaces = new Uint32Array(nbFaces * 3);
	let bufferVertIndex = 0;
	let bufferFaceIndex = 0;
	let pastFaceNb = 0;
	const colorVertices = [];
	_buildings.forEach(building => {
		let buildingCoordNb = building.nodes.length / 2;
		fondationsLat = -10;
		for (let floor = 0; floor < building.props.floorsNb + 1; floor ++) {
			for (let c = 0; c < buildingCoordNb; c ++) {
				colorVertices.push(...building.props.wallColor);
				if (floor > 0) {
					const faceTopLeft = buildingCoordNb + c;
					const faceBottomLeft = c;
					let faceBottomRight = c + 1;
					let faceTopRight = faceBottomRight + buildingCoordNb;
					if (faceBottomRight >= buildingCoordNb) {
						faceBottomRight = 0;
						faceTopRight = buildingCoordNb;
					}
					const tmp = (floor - 1) * buildingCoordNb;
					bufferFaces[bufferFaceIndex + 0] = faceTopLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 1] = faceBottomLeft + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 2] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 3] = faceBottomRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 4] = faceTopRight + pastFaceNb + tmp;
					bufferFaces[bufferFaceIndex + 5] = faceTopLeft + pastFaceNb + tmp;
					bufferFaceIndex += 6;
				}
				bufferCoord[bufferVertIndex + 0] = building.nodes[c * 2 + 0];
				bufferCoord[bufferVertIndex + 1] = building.nodes[c * 2 + 1];
				bufferCoord[bufferVertIndex + 2] = fondationsLat + building.props.minAlt + (floor * building.props.floorHeight);
				bufferVertIndex += 3;
			}
			fondationsLat = 0;
		}
		pastFaceNb += buildingCoordNb * (building.props.floorsNb + 1);
	});

	return {
		nbVert : nbVert, 
		nbFaces : nbFaces, 
		bufferCoord : bufferCoord, 
		bufferFaces : bufferFaces, 
		bufferColor : new Uint8Array(colorVertices), 
	};
}