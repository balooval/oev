<script id="vertAtmosphere" type="x-shader/x-vertex">
varying vec3 vNormal;
void main() 
{
    vNormal = normalize( normalMatrix * normal );
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
</script>

<script id="fragAtmosphere" type="x-shader/x-vertex"> 
varying vec3 vNormal;
void main() 
{
	float intensity = pow( 0.7 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0 ); 
    gl_FragColor = vec4( 0.5, 0.5, 1.0, 1.0 ) * intensity;
}
</script>