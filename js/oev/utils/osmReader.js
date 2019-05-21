const api = {
    setDatas : function(_json) {
        const parsedJson = JSON.parse(_json);
        const nodesList = extractNodes(parsedJson);
        const waysList = extractWays(parsedJson);
        const extractedRelations = extractElements(parsedJson, 'relation');
        const extractedWays = extractElements(parsedJson, 'way');
    }, 
};

function extractNodes(_datas) {
    const nodes = {};
    _datas.elements
    .filter(e => e.type == 'node')
	.forEach(node => {
		nodes['NODE_' + node.id] = [
			parseFloat(node.lon), 
			parseFloat(node.lat)
		];
    });
    return nodes;
}

function extractWays(_datas) {
    const ways = {};
    _datas.elements
    .filter(e => e.type == 'way')
	.forEach(way => {
		ways['WAY_' + way.id] = way;
    });
    return ways;
}

function buildRelation(_relation, _nodesList, _waysList) {
    const innersCoords = _relation.members
    .filter(member => member.role == 'inner')
    .map(innerMember => {
        return _waysList['WAY_' + innerMember.ref].nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
    })
    .map(innerWay => {
        const cleanWay = [...innerWay];
        cleanWay.pop();
        return cleanWay;
    });
    let wayNodes = [];
    _relation.members.filter(member => member.role == 'outer')
    .forEach(member => {
        const outerWay = _waysList['WAY_' + member.ref];
        const cleanWay = outerWay.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
        cleanWay.pop();
        wayNodes.push(...cleanWay.slice(1));
    });
    const border = wayNodes.slice(1);
    const bbox = calcBbox(border);
    const grid = coordGrid(bbox, border);
    return {
        id : _relation.id, 
        type : extractType(_relation), 
        border : border, 
        fillPoints : grid, 
        holes : innersCoords, 
    };
}

function buildWay(_way, _nodesList) {
    let wayNodes = _way.nodes.map(nodeId => _nodesList['NODE_' + nodeId]);
    const border = wayNodes.slice(1);
    const bbox = calcBbox(border);
    const grid = coordGrid(bbox, border);
    return {
        id : _way.id, 
        type : extractType(_way), 
        border : border, 
        fillPoints : grid, 
        holes : [], 
    };
}

function extractElements(_datas, _type) {
    return _datas.elements
	.filter(e => e.type == _type)
	.filter(e => e.tags)
    .filter(e => isTagSupported(e));
}

function isTagSupported(_element) {
    const type = extractType(_element);
    if (!type) return false;
	return true;
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

const equalsTags = {
    wood : 'forest', 
    farmyard : 'grass', 
    farmland : 'grass', 
    grassland : 'grass', 
    orchard : 'grass', 
    meadow : 'grass', 
    greenfield : 'grass', 
    village_green : 'grass', 
};

const tagsZoom = {
    forest : 15, 
    scrub : 15, 
    vineyard : 16, 
    grass : 17, 
};

const supportedTags = [
    {
        key : 'landuse', 
        values : [
            'vineyard', 
            'forest', 
            'scrub', 
            
            'wood', 
            'grass', 
            'farmyard', 
            'farmland', 
            'grassland', 
            'orchard', 
            'meadow', 
            'greenfield', 
            'village_green', 
        ]
    }, 
    {
        key : 'natural', 
        values : [
            'vineyard', 
            'forest', 
            'wood', 
            'scrub', 
            
            'grass', 
            'farmyard', 
            'farmland', 
            'grassland', 
            'orchard', 
            'meadow', 
            'greenfield', 
            'village_green', 
        ], 
    }, 
];

export {api as default};