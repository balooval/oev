<script id="vertImpostor" type="x-shader/x-vertex">
precision highp float;
varying vec3 vColor;
void main() 
{
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	
	
	vColor = vec3(atan(mvPosition.y, mvPosition.x), 0.0, 0.0);

	// vColor = vec3(( 1000.0 / length( mvPosition.xyz ) ), 0.0, 0.0); // set RGB color associated to vertex; use later in fragment shader.
	// option (1): draw particles at constant size on screen
	// gl_PointSize = 50.0;
    // option (2): scale particles as objects in 3D space
	gl_PointSize = 10.0 * ( 300.0 / length( mvPosition.xyz ) );
	gl_Position = projectionMatrix * mvPosition;
}
</script>
<script type="x-shader/x-fragment" id="fragImpostor">
precision highp float;
uniform sampler2D texture;
varying vec3 vColor; // colors associated to vertices; assigned by vertex shader
void main() 
{
	// calculates a color for the particle
	gl_FragColor = vec4( vColor, 1.0 );
	// sets a white particle texture to desired color
	gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
}
</script>




<script id="vertImpostorA" type="x-shader/x-fragment">
precision highp float;
varying vec2 vUv;
varying vec2 testDist;
void main() {
	vUv = uv;
	
	// mat4 modelView = viewMatrix * modelMatrix;
	mat4 modelView = modelViewMatrix;
	
	// Column 0:
	modelView[0][0] = 1.0;
	modelView[0][1] = 0.0;
	modelView[0][2] = 0.0;
/*
	// Column 1:
	modelView[1][0] = 0.0;
	modelView[1][1] = 1.0;
	modelView[1][2] = 0.0;
*/
	
	// Column 2:
	modelView[2][0] = 0.0;
	modelView[2][1] = 0.0;
	modelView[2][2] = 1.0;
	
	
	vec4 P = modelView * vec4(position,1.0);
	gl_Position = projectionMatrix * P;
	
	/*
	
	vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
	vec4 p = projectionMatrix * mvPosition;
	gl_Position = p;
	*/
	
	/*
	
	// testDist = modelViewMatrix * vec4(1.0);
	testDist = atan(cameraPosition.y-position.y, cameraPosition.x-position.x) * vec2(1.0);
	
	gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(position,1.0);
	*/
}
</script>
<script id="fragImpostorA" type="x-shader/x-fragment">
precision highp float;
uniform sampler2D texture;
varying vec2 vUv;
// varying vec2 testDist;
uniform float time;
void main() {
	/*
	// vUv.x = vUv.x + time * 0.01;
	// gl_FragColor = texture2D(texture, vUv);
	float px = 0.0;
	if (time < 0.5) {
		px = 0.0;
	} else if (time < 1.0) {
		px = 0.25;
	} else if (time < 2.0) {
		px = 0.5;
	} else if (time < 3.0) {
		px = 0.75;
	}
	
	vec2 pxlUv = vec2(vUv.x, vUv.y);
	// pxlUv.x = px + pxlUv.x * 0.25;
	// pxlUv.x = testDist.x * 0.0001 + pxlUv.x * 0.25;
	pxlUv.x = testDist.x + pxlUv.x;
	gl_FragColor = texture2D(texture, pxlUv);
	
	// gl_FragColor = vec4(testDist.x, testDist.y, testDist.z, 1.0);
	*/
	gl_FragColor = texture2D(texture, vUv);
}

</script>

gl_FragColor = vec4(1.0,  // R
                      0.0,  // G
                      1.0,  // B
                      1.0); // A