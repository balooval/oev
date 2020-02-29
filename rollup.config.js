import path from 'path';

export default {
  input: 'js/app.js',
  output: {
    file: 'bundle.js',
    format: 'esm'
  }, 
  external: [
    path.resolve( __dirname, 'js/libs/three.module.js' ), 
    path.resolve( __dirname, 'js/libs/BufferGeometryUtils-module.js' ), 
    path.resolve( __dirname, 'js/libs/polygon-clipping.esm.js' ), 
    path.resolve( __dirname, 'js/libs/perlin.js' ), 
    path.resolve( __dirname, 'js/libs/Earcut.js' ), 
    path.resolve( __dirname, 'js/libs/GPXParser-module.js' ), 
  ]
};