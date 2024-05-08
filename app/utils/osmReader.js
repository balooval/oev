export function extractNodes(datas) {
    const nodes = new Map();
    const extractedNodes = extractElements(datas, 'node');

    for (let i = 0; i < extractedNodes.length; i ++) {
        const node = extractedNodes[i];
        nodes.set('NODE_' + node.id, [
            parseFloat(node.lon), 
            parseFloat(node.lat)
        ]);
    }

    return nodes;
}

export function extractWays(datas) {
    const ways = new Map();
    const extractedWays = extractElements(datas, 'way');

    for (let i = 0; i < extractedWays.length; i ++) {
        const way = extractedWays[i];
        ways.set('WAY_' + way.id, way);
    }

    return ways;
}

export function extractElements(datas, type) {
    const elements = [];
    
    for (let i = 0; i < datas.elements.length; i ++) {
        const element = datas.elements[i];
        if (element.type != type) continue;
        elements.push(element);
    }

    return elements;
}