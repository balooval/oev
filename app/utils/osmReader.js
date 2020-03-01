const api = {
    extractNodes : function(_datas) {
        const nodes = new Map();
        const extractedNodes = api.extractElements(_datas, 'node');
        for (let i = 0; i < extractedNodes.length; i ++) {
            const node = extractedNodes[i];
            nodes.set('NODE_' + node.id, [
                parseFloat(node.lon), 
                parseFloat(node.lat)
            ]);
        }
        return nodes;
    }, 

    extractWays : function(_datas) {
        const ways = new Map();
        const extractedWays = api.extractElements(_datas, 'way');
        for (let i = 0; i < extractedWays.length; i ++) {
            const way = extractedWays[i];
            ways.set('WAY_' + way.id, way);
        }
        return ways;
    }, 

    extractElements : function(_datas, _type) {
        const elements = [];
        for (let i = 0; i < _datas.elements.length; i ++) {
            const element = _datas.elements[i];
            if (element.type != _type) continue;
            elements.push(element);
        }
        return elements;
    }, 

};

export {api as default};