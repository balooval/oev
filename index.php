<?php
include( 'libs/init.php' );
?>
<!DOCTYPE html>
<html>
	<head>
		<title>OpenEarthViewer</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" href="css/styles.css" type="text/css" />
		<script type="text/javascript" src="js/libs/three.js"></script>
		<script type="text/javascript" src="js/oev/utils.js"></script>
		<script type="text/javascript" src="js/oev/tile.js"></script>
		<script type="text/javascript" src="js/oev/geo.js"></script>
		<script type="text/javascript" src="js/oev/input.js"></script>
		<script type="text/javascript" src="js/oev/tileBuilding.js"></script>
		<script type="text/javascript" src="js/oev/navigation.js"></script>
		<script type="text/javascript" src="js/oev/sky.js"></script>
		<script type="text/javascript" src="js/oev/math.js"></script>
		<script type="text/javascript" src="js/oev/animation.js"></script>
		<script type="text/javascript" src="js/OEV.js"></script>
		<script type="text/javascript" src="js/UI.js"></script>
		<script type="text/javascript" src="js/CamCtrl.js"></script>
		
		<script type="text/javascript" src="js/Tile3d.js"></script>
		<script type="text/javascript" src="js/TileSurface.js"></script>
		<script type="text/javascript" src="js/TileNodes.js"></script>
		<script type="text/javascript" src="js/Globe.js"></script>
		<script type="text/javascript" src="js/DatasMng.js"></script>
		<script type="text/javascript" src="js/DatasProvider.js"></script>
		<script type="text/javascript" src="js/Earcut.js"></script>
		<script type="text/javascript" src="js/utils/lineclip.js"></script>
		<script type="text/javascript" src="js/utils/geojson-area.js"></script>
		<script type="text/javascript" src="js/plugins/GpxMng.js"></script>
		<script type="text/javascript" src="js/plugins/PlanesMng.js"></script>
		<script type="text/javascript" src="js/net/NetCtrl.js"></script>
		
		<script type="text/javascript" src="js/postprocessing/EffectComposer.js"></script>
		<script type="text/javascript" src="js/postprocessing/CopyShader.js"></script>
		<script type="text/javascript" src="js/postprocessing/ShaderPass.js"></script>
		<script type="text/javascript" src="js/postprocessing/RenderPass.js"></script>
		<script type="text/javascript" src="js/postprocessing/MaskPass.js"></script>
		<script type="text/javascript" src="js/postprocessing/BokehPass.js"></script>
		<script type="text/javascript" src="js/postprocessing/BokehShader.js"></script>
		
		<script type="text/javascript" src="js/utils/water.js"></script>
	</head>
	<body onkeydown="Oev.Input.Keyboad.onKeyDown(event)" onkeyup="Oev.Input.Keyboad.onKeyUp(event)">
		<div id="modalContainer">
			<div id="modalWindow">
				<a href="#" onclick="closeModal();"><img src="img/ico_close.png" alt="close" title="close"></a>
				<div id="modalContent">
				
				</div>
			</div>
		</div>
		
		<div id="boxNotification">
		</div>
		
		
			<div id="header">OpenEarthView(er)</div>
			<div id="main">
				<div id="tools">
					<a href="standby.php">STOP</a>
					<div id="debugBox"></div>
					<div class="toolsBox" id="search_box">
						<form onsubmit="return querySearch();" action="#top">
							<input type="text" name="search_value" id="search_value" placeholder="search place">
						</form>
					</div>
					<div class="toolsBox" id="config_network">
						<h3 data-content="network" class="activ"><div class="ico_expend activ" id="expend_network"></div> Network</h3>
						<div class="toolsContent activ" id="toolsContent_network">
							<div id="ws_status">
								...
							</div>
							<div id="ws_users_list">
								
							</div>
							<div id="ws_chat">
								<img src="img/ico_tchat.png" alt="tchat" title="tchat">
								<div id="ws_chat_histo">
								</div>
								<form id="ws_chat_form">
									<input type="text" id="ws_chat_msg" placeholder="enter your message" autocomplete="off"> <input type="submit" id="ws_chat_send" value="send">
								</form>
							</div>
						</div>
					</div>
					<div class="toolsBox" id="config_box">
						<h3 data-content="layers" class="activ"><div class="ico_expend activ" id="expend_layers"></div> Layer</h3>
						<div class="toolsContent activ" id="toolsContent_layers">
							<input type="radio" name="cfg_tile_layer" value="tileOsm" checked="checked"> Osm Standard
							<br>
							<input type="radio" name="cfg_tile_layer" value="tileMapbox"> Mapbox Satellite
						</div>
					</div>
					<div class="toolsBox">
						<h3 data-content="datasToLoad" class="activ"><div class="ico_expend activ" id="expend_datasToLoad"></div> Datas to load</h3>
						<div class="toolsContent activ" id="toolsContent_datasToLoad">
							<input type="checkbox" name="cfg_load_ele" id="cfg_load_ele" value="1" <?php echo $cfgForm['load_ele'];?>> <label for="cfg_load_ele">Elevation</label>
							<br>
							<input type="checkbox" name="cfg_load_buildings" id="cfg_load_buildings" value="1" <?php echo $cfgForm['load_buildings'];?>> <label for="cfg_load_buildings">Buildings</label> <a href="#" onclick="openConfigBuildings();"><img src="img/ico_config.png" alt="config" title="config"></a>
							<br>
							<input type="checkbox" name="cfg_load_nodes" id="cfg_load_nodes" value="1"> <label for="cfg_load_nodes">Nodes</label>
							<br>
							<input type="checkbox" name="cfg_load_landuse" id="cfg_load_landuse" value="1"> <label for="cfg_load_landuse">Landuse</label> <a href="#" onclick="openConfigLanduse();"><img src="img/ico_config.png" alt="config" title="config"></a>
							<br>
							<div id="models_switch"></div>
						</div>
					</div>	
					<div class="toolsBox">
						<h3 data-content="tools" class="activ"><div class="ico_expend activ" id="expend_tools"></div> Tools</h3>
						<div class="toolsContent activ" id="toolsContent_tools">
							<div class="btn" id="btnPlugins" onclick="openPlugins();" title="more tools">Plugins</div>
							<div class="btn" id="btnDof" onclick="OEV.switchDof();" title="switch depth of field">DOF</div>
							<div class="btn" id="btnClouds" onclick="OEV.switchClouds();" title="switch clouds">Clouds</div>
							<br>
							Fog Near <input type="range" id="cfg_fog_near">
							<br>
							Fog Far <input type="range" id="cfg_fog_far">
						</div>
					</div>
					<div class="toolsBox">
						<h3 data-content="waypoints" class="activ"><div class="ico_expend activ" id="expend_waypoints"></div> Waypoints</h3>
						<br>
						<div class="btn" onclick="showWPDialog();" title="Save current location">Add waypoint</div>
						<div class="toolsContent activ" id="toolsContent_waypoints">
							<div id="waypointsInfos"></div>
						</div>
					</div>
					<div class="toolsBox">
						<h3 data-content="navigation" class="activ"><div class="ico_expend activ" id="expend_navigation"></div> Navigation</h3>
						<div class="toolsContent activ" id="toolsContent_navigation">
							<div class="heading" id="camHeading" onclick="resetHeading();"></div>
							<br>
							<input type="button" value="Zoom -" onclick="zoomOut();" title="-">
							<span id="zoom_level" style="display:inline-block;width:20px;overflow:hidden;">0</span>
							<input type="button" value="Zoom +" onclick="zoomIn();" title="+">
						</div>
					</div>
				</div>
				
				<div id="threeContainer">
					<div class="overlayUI" id="overlayUICoords">
						--
					</div>
					<div class="overlayUI" id="overlayUILoading">
						<div id="loading_OBJECTS"></div>
						<div id="loading_TILE2D"></div>
						<div id="loading_ELE"></div>
						<div id="loading_MODELS"></div>
						<div id="loading_BUILDINGS"></div>
						<div id="loading_SURFACE"></div>
						<div id="loading_NODES"></div>
					</div>
					<div class="overlayUI" id="overlayPlugins">
						
					</div>
					<div class="overlayUI" id="overlayMinimap">
						<div id="minimapMarkerCam"></div>
						<div id="minimapMarkerSun"></div>
					</div>
				</div>
			</div>
			<div id="footer">
				<a href="credits.html" onclick="showCredits();return false;">Credits</a> | 
				<a id="contactLink" href="mailto:toto@toto.com">Contact</a>
			</div>
<?php
	include( 'js/shaders/ocean.php' );
	include( 'js/shaders/atmosphere.php' );
	include( 'js/shaders/water.php' );
?>
		<script>
<?php
			// echo $cfgJS;
			echo 'var DEV = "";';
?>
		</script>
		<script>
		
			var vertMixShader = document.getElementById('vertWater').innerHTML;
			var fragMixShader = document.getElementById('fragWater').innerHTML;
			
			var OEV = new OpenEarthViewer( 'threeContainer' );
			OEV.init();
			
			document.getElementById("cfg_load_ele").checked = true;
			switchElevation();
			
			
			function render() {
				requestAnimationFrame( render );
				OEV.render();
			}
		</script>
			
	</body>
</html>
<?php
logIp();
?>