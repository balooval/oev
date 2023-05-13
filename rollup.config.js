import path from 'path';

export default {
  input: 'app/app.js',
  output: {
    file: 'bundle.js',
    format: 'esm', 
  }, 
  external: [
    path.resolve( __dirname, 'app/vendor/BufferGeometryUtils.module.js' ), 
    path.resolve( __dirname, 'app/vendor/Earcut.module.js' ), 
    path.resolve( __dirname, 'js/vendor/GPXParser.module.js' ), 
    path.resolve( __dirname, 'app/vendor/jsts.module.js' ), 
    path.resolve( __dirname, 'app/vendor/lineclip.module.js' ), 
    path.resolve( __dirname, 'app/vendor/perlin.module.js' ), 
    path.resolve( __dirname, 'app/vendor/poly2tri.module.js' ), 
    path.resolve( __dirname, 'app/vendor/polygon-clipping.module.js' ), 
    path.resolve( __dirname, 'app/vendor/splay.module.js' ), 
    path.resolve( __dirname, 'app/vendor/three.module.js' ), 
  ]
};