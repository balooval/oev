onmessage = function(_evt) {
	let datas = readJson(_evt.data.json);
	datas = makeTexture(datas, _evt.data.bbox, _evt.data.definition);
	postMessage(datas);
}

function readJson(_datas) {
	const json = JSON.parse(_datas);
	const nodesList = {};
	const jsonNodes = json.elements.filter(e => e.type == 'node');
	jsonNodes.forEach(n => {
		nodesList['NODE_' + n.id] = [
			parseFloat(n.lon), 
			parseFloat(n.lat)
		];
	});
	const landusesList = [];
	const ways = {};
	json.elements
	.filter(e => e.type == 'way')
	.forEach(way => {
		ways['WAY_' + way.id] = way;
	});
	const relations = {};
	json.elements
	.filter(e => e.type == 'relation')
	.forEach(rel => {
		relations['REL_' + rel.id] = rel.members;
	});

	json.elements
	.filter(e => e.type == 'relation')
	.forEach(rel => {
		const props = cleanTags(rel.tags);
		if (props.type == 'unsupported') return;
		
		const innersCoords = rel.members
		.filter(member => member.role == 'inner')
		.map(innerMember => {
			return ways['WAY_' + innerMember.ref].nodes.map(nodeId => nodesList['NODE_' + nodeId])
		});
		const wayNodes = [];
		const outerMembers = rel.members.filter(member => member.role == 'outer');
		outerMembers.forEach(member => {
			const outerWay = ways['WAY_' + member.ref];
			wayNodes.push(...outerWay.nodes.map(nodeId => nodesList['NODE_' + nodeId]));
		});
		const relation = {
			id : rel.id, 
			props : props, 
			coords : wayNodes, 
			holes : innersCoords, 
		};
		landusesList.push(relation);
	});
	json.elements
	.filter(e => e.type == 'way')
	.filter(way => way.tags)
	.forEach(way => {
		const props = cleanTags(way.tags);
		if (props.type == 'unsupported') return;
		const wayNodes = way.nodes.map(nodeId => nodesList['NODE_' + nodeId]);
		landusesList.push({
			id : way.id, 
			props : props, 
			coords : wayNodes, 
			holes : [], 
		});
	});
	return landusesList;
}

function cleanTags(_tags) {
	const tags = {
		type : 'unsupported', 
	};
	if (_tags.landuse) tags.type = _tags.landuse;
	if (_tags.natural) tags.type = _tags.natural;
	const supported = [
		'vineyard', 
		'forest', 
		'wood', 
		'scrub', 

		'farmyard', 
		'farmland', 
		'grass', 
		'grassland', 
		'orchard', 
		'meadow', 
		'greenfield', 
		'village_green', 
	];

	const excluded = [
		'residential', 
		'industrial', 
		'retail', 
		'cemetery', 
		'construction', 
		'quarry', 
		'commercial', 
		'water', 
		'recreation_ground', 
		'railway', 
		'heath', 
		'basin', 
		'allotments', 
		'spring', 
		'unsupported', 
		'cliff', 
		'beach', 
		'allotments', 
		'brownfield', 
		'military', 
		'tree_row', 
		'education', 
		'plant_nursery', 
		'yes', 
		'tourism', 
		'wetland', 
		'reservoir', 
		'coastline', 
		'bare_rock', 
		'greenhouse_horticulture', 
	];

	if (!supported.includes(tags.type)) {
		if (!excluded.includes(tags.type)) console.log('tags.type', tags.type);
		tags.type = 'unsupported';
	}
	return tags;
}

function makeTexture(_landuses, _bbox, _definition) {
	const specificTextures = ['vineyard', 'scrub', 'wood', 'forest'];
	// TODO: virer les polygones qui ne sont pas dans ma bbox
	const landusesCanvasInfos = _landuses.map(landuse => {
		let textureType = 'other';
		if (specificTextures.includes(landuse.props.type)) textureType = landuse.props.type;
		return {
			texture : textureType, 
			positions: landuse.coords.map(pos => {
				return [
					mapValue(pos[0], _bbox.startX, _bbox.endX) * _definition, 
					mapValue(pos[1], _bbox.startY, _bbox.endY) * _definition
				];
			}), 
			holes: landuse.holes.map(hole => {
				return hole.map(pos => {
					return [
						this.mapValue(pos[0], _bbox.startX, _bbox.endX) * _definition, 
						this.mapValue(pos[1], _bbox.startY, _bbox.endY) * _definition
					];
				});
			}), 
		};
	});
	return landusesCanvasInfos;
}

function mapValue(_value, _min, _max) {
	const length = Math.abs(_max - _min);
	if (length == 0) return _value;
	return (_value - _min) / length;
}