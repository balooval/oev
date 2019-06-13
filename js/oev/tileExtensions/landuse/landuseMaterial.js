import Evt from '../../utils/event.js';
import Renderer from '../../renderer.js';
import GLOBE from '../../globe.js';
import * as TileExtension from '../tileExtension.js';
import * as NET_TEXTURES from '../../net/textures.js';

TileExtension.evt.addEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension);

const texturesToLoad = [
    ['shell_void', 'shell_void.png'], 
    ['splat', 'splat_alpha.png'], 
    
    // ['shell_water_normal_1', 'shell_water_normal_tumblr_1.png'], 
    // ['shell_water_normal_2', 'shell_water_normal_tumblr_2.png'], 
    // ['shell_water_normal_3', 'shell_water_normal_tumblr_3.png'], 

    ['shell_tree_0', 'shell_tree_0.png'], 
    ['shell_tree_1', 'shell_tree_1_grey.png'], 
    ['shell_tree_2', 'shell_tree_2_grey.png'], 
    ['shell_tree_3', 'shell_tree_3_grey.png'], 
    ['shell_tree_4', 'shell_tree_4_grey.png'], 
    
    ['shell_tree_normal', 'shell_tree_normal.png'], 
    // ['shell_tree_specular', 'shell_tree_specular.png'], 

    // ['shell_vine_1', 'shell_vine_1.png'], 
    // ['shell_vine_2', 'shell_vine_2.png'], 
    // ['shell_vine_3', 'shell_vine_3.png'], 
    // ['shell_vine_4', 'shell_vine_4.png'], 
    // ['shell_vine_normal', 'vine_normal.png'], 
    // ['shell_vine_specular', 'shell_vine_specular.png'], 

    // ['shell_grass_1', 'shell_grass_1.png'], 
    // ['shell_grass_2', 'shell_grass_2.png'], 
    // ['shell_grass_normal', 'shell_grass_normal.png'], 
    // ['shell_grass_specular', 'shell_grass_specular.png'], 

    ['shell_scrub_1', 'shell_scrub_mix_1.png'], 
    ['shell_scrub_2', 'shell_scrub_grey_2.png'], 
    ['shell_scrub_3', 'shell_scrub_grey_3.png'], 
    ['shell_scrub_normal', 'shell_scrub_mix_normal.png'], 

    ['shell_rock_1', 'shell_rock_1.png'], 
    ['shell_rock_normal', 'shell_rock_normal.png'], 

    // ['shell_scrub_specular', 'shell_scrub_mix_specular.png'], 
    
];

const api = {
    evt : new Evt(), 
    isReady : false, 

    material : function(_type) {
        return materials[_type];
    }, 
};

const materials = {
    forest : [], 
    scrub : [], 
    grass : [], 
    vineyard : [], 
    rock : [], 
    water : [], 
    wetland : [], 
};


function onActivateExtension() {
    TileExtension.evt.removeEventListener('TILE_EXTENSION_ACTIVATE_LANDUSE', null, onActivateExtension);
    createMaterials();
    loadTextures();
}

function createMaterials() {
        // const sided = THREE.DoubleSide;
        const sided = THREE.FrontSide;

        
        // materials.wetland.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x18472d, side:sided}));
        // materials.wetland.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.wetland.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));

        // materials.water.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x18472d, side:sided}));
        // materials.water.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x3f66aa, side:sided, transparent:true, opacity:0.6}));
        // materials.water.push(new THREE.MeshPhysicalMaterial({roughness:0,metalness:0, color:0x4a7ed6, side:sided, transparent:true, opacity:0.3}));

        // materials.forest.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:1,metalness:0, color:0xFFFFFF, side:sided}));
        materials.forest.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        materials.forest.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:0.9,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.6}));
        materials.forest.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.7}));
        materials.forest.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:0.7,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.8}));

        // materials.scrub.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided}));
        // materials.scrub.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        materials.scrub.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:0.9,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        materials.scrub.push(new THREE.MeshPhysicalMaterial({vertexColors:THREE.VertexColors,roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        
        // materials.grass.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.grass.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        // materials.vineyard.push(new THREE.MeshPhysicalMaterial({roughness:0.8,metalness:0, color:0xFFFFFF, side:sided, transparent:true, alphaTest:0.2}));
        
        materials.rock.push(new THREE.MeshPhysicalMaterial({roughness:1,metalness:0, color:0xFFFFFF, side:sided, transparent:false, alphaTest:0.2}));
}

function loadTextures() {
    const texturesList = [];
    texturesToLoad.forEach(d => NET_TEXTURES.addToList(texturesList, d[0], d[1]));
    NET_TEXTURES.loadBatch(texturesList, onTexturesLoaded);
}

function onTexturesLoaded() {
    // materials.water[0].normalMap = NET_TEXTURES.texture('shell_water_normal_1');
    // materials.water[1].normalMap = NET_TEXTURES.texture('shell_water_normal_2');
    // materials.water[2].normalMap = NET_TEXTURES.texture('shell_water_normal_3');

    // materials.wetland[0].normalMap = NET_TEXTURES.texture('shell_water_normal_1');
    // materials.wetland[1].map = NET_TEXTURES.texture('shell_scrub_2');
    // materials.wetland[1].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
    // materials.wetland[1].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
    // materials.wetland[2].map = NET_TEXTURES.texture('shell_scrub_3');
    // materials.wetland[2].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
    // materials.wetland[2].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');

    // materials.forest[0].map = NET_TEXTURES.texture('shell_tree_0');
    materials.forest[0].map = NET_TEXTURES.texture('shell_tree_1');
    materials.forest[1].map = NET_TEXTURES.texture('shell_tree_2');
    materials.forest[2].map = NET_TEXTURES.texture('shell_tree_3');
    materials.forest[3].map = NET_TEXTURES.texture('shell_tree_4');

    materials.forest[1].normalMap = NET_TEXTURES.texture('shell_tree_normal');
    materials.forest[2].normalMap = NET_TEXTURES.texture('shell_tree_normal');
    materials.forest[3].normalMap = NET_TEXTURES.texture('shell_tree_normal');
    // materials.forest[2].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');
    // materials.forest[3].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');
    // materials.forest[4].roughnessMap = NET_TEXTURES.texture('shell_tree_specular');

    // materials.scrub[0].map = NET_TEXTURES.texture('shell_tree_0');
    materials.scrub[0].map = NET_TEXTURES.texture('shell_scrub_2');
    materials.scrub[1].map = NET_TEXTURES.texture('shell_scrub_3');
    // materials.scrub[3].map = NET_TEXTURES.texture('shell_scrub_3');
    
    materials.scrub[0].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
    materials.scrub[1].normalMap = NET_TEXTURES.texture('shell_scrub_normal');
    // materials.scrub[2].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
    // materials.scrub[3].roughnessMap = NET_TEXTURES.texture('shell_scrub_specular');
    
    materials.rock[0].map = NET_TEXTURES.texture('shell_rock_1');
    materials.rock[0].normalMap = NET_TEXTURES.texture('shell_rock_normal');

    // materials.vineyard[0].map = NET_TEXTURES.texture('shell_vine_2');
    // materials.vineyard[1].map = NET_TEXTURES.texture('shell_vine_2');
    // materials.vineyard[2].map = NET_TEXTURES.texture('shell_vine_3');
    // materials.vineyard[3].map = NET_TEXTURES.texture('shell_vine_4');

    // materials.vineyard[1].normalMap = NET_TEXTURES.texture('shell_vine_normal');
    // materials.vineyard[2].normalMap = NET_TEXTURES.texture('shell_vine_normal');
    // materials.vineyard[3].normalMap = NET_TEXTURES.texture('shell_vine_normal');
    // materials.vineyard[1].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
    // materials.vineyard[2].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
    // materials.vineyard[3].roughnessMap = NET_TEXTURES.texture('shell_vine_specular');
    
    // materials.grass[0].map = NET_TEXTURES.texture('shell_grass_1');
    // materials.grass[1].map = NET_TEXTURES.texture('shell_grass_2');
    
    // materials.grass[1].roughnessMap = NET_TEXTURES.texture('shell_grass_specular');
    // materials.grass[1].normalMap = NET_TEXTURES.texture('shell_grass_normal');

/*
    const shaderA = function (shader) {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            'vUv = (uvTransform * vec3(uv, 1)).xy;', 
            'float uTime = time + vUv.y;', 
            'vUv.x += time * 0.001;', 
            'vUv.y -= time * 0.001;', 
        ].join('\n'));
        materialAnimator.toto(shader);
    };

    const shaderB = function (shader) {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            'vUv = (uvTransform * vec3(uv, 1)).xy;', 
            'float uTime = time + vUv.y;', 
            'vUv.x -= time * 0.003;', 
            'vUv.y -= time * 0.001;', 
        ].join('\n'));
        materialAnimator.toto(shader);
    };

    const shaderC = function (shader) {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', [
            'vUv = (uvTransform * vec3(uv, 1)).xy;', 
            'float uTime = time + vUv.y;', 
            'vUv.x += time * 0.005;', 
            'vUv.y += time * 0.002;', 
        ].join('\n'));
        materialAnimator.toto(shader);
    };
*/
    // materialAnimator.applyCustomShader(materials.water[0], shaderA);
    // materialAnimator.applyCustomShader(materials.water[1], shaderB);
    // materialAnimator.applyCustomShader(materials.water[2], shaderC);
    // GLOBE.addObjToUpdate(materialAnimator);

    api.isReady = true;
    api.evt.fireEvent('READY')
}

const materialAnimator = (function () {
    const shaders = [];

    const api = {
        update : function() {
            const time = performance.now() / 1000;
            for (let i = 0; i < shaders.length; i ++) {
                shaders[i].uniforms.time.value = time * (i + 0.5);
            }
            Renderer.MUST_RENDER = true;
        }, 

        toto : function(_shader) {
            shaders.push(_shader);
        }, 

        applyCustomShader : function(_material, _glsl) {
            _material.onBeforeCompile = _glsl;
        },
    };
    return api; 
})();

export {api as default};