<?php
require_once( dirname( __FILE__ ).'/init.php' );




if( isset( $_GET['url'] ) ){
	$url = urldecode( $_GET['url'] );
	header('Content-type: image/png');
	readfile($url);
}

// mapbox key
// pk.eyJ1IjoiYmFsb292YWwiLCJhIjoiY2lrMmF2d2FrMDJ6eHhia295MWFub3dsMiJ9._K2WzZ0dEZk0CyxvJCUfLQ




$NO_CACHE = false;
if( isset( $_GET['nocache'] ) ){
	$NO_CACHE = true;
}


$serversOverpass = array( 
	'http://www.overpass-api.de/api', 
	'http://overpass.osm.rambler.ru/cgi', 
	'http://overpass.osm.rambler.ru/cgi', 
	'http://api.openstreetmap.fr/oapi/interpreter/',
	'http://api.openstreetmap.fr/oapi/interpreter/'
);
			

			
if( isset( $_GET['overpass_nodes'] ) ){ // charger tous les objets nodes à afficher
	$x = $_GET['tileX'];
	$y = $_GET['tileY'];
	$z = $_GET['zoom'];
	$startC = tileToCoords( $x, $y, $z );
	$endC = tileToCoords( $x + 1, $y + 1, $z );
	
	$dirName = 'cacheOverpassObjects';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x.'/'.$y;
	makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x, $y ) );
	
	if( $NO_CACHE || !is_file( $fullPath.'/amenity.json' ) ){
		$south = $endC[1];
		$north = $startC[1];
		$east = $startC[0];
		$west = $endC[0];
		$coord = '('.$south.','.$east.','.$north.','.$west.')';
		
		$curServer = $serversOverpass[round( rand( 0, count( $serversOverpass ) - 1 ) )];
		// $url = $curServer.'/interpreter?data=[out:json];(node'.$coord.'["amenity"~"."];);out;';
		$url = $curServer.'/interpreter?data=[out:json];(node'.$coord.'["amenity"~"."];node'.$coord.'["tourism"="artwork"]["artwork_type"="statue"];);out;';
		$datas = file_get_contents( $url );
		file_put_contents( $fullPath.'/amenity.json', $datas);
	}
	$cache = @file_get_contents( $fullPath.'/amenity.json' );
	if( $cache != '' ){
		echo $cache;
	}else{
		unlink( $fullPath.'/amenity.json' );
		echo '{
			"elements": [
		  ]
		}';
	}
}else if( isset( $_GET['overpass_buildings'] ) ){
	// $OVERPASS_SURFACES = json_decode( file_get_contents( dirname( __FILE__ ).'/../cfg_surfaces.json' ), true );
	
	$x = $_GET['tileX'];
	$y = $_GET['tileY'];
	$z = $_GET['zoom'];
	
	$dirName = 'cacheOverpassBuildings';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x.'/'.$y;
	makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x, $y ) );
	
	if( $NO_CACHE || !is_file( $fullPath.'/ways.json' ) ){
	// if( true ){
		$startC = tileToCoords( $x, $y, $z );
		$endC = tileToCoords( $x + 1, $y + 1, $z );
		$south = $endC[1];
		$north = $startC[1];
		$east = $startC[0];
		$west = $endC[0];
		$coord = '('.$south.','.$east.','.$north.','.$west.')';

		$curServer = $serversOverpass[round( rand( 0, count( $serversOverpass ) - 1 ) )];
		$url = $curServer.'/interpreter?data=[out:json];(way'.$coord.'["building"~"."];way'.$coord.'["building:part"~"."]);(._;>;);out;';
		// $url = $curServer.'/interpreter?data=[out:json];(way'.$coord.'["building"~"."];way'.$coord.'["building:part"~"."];relation'.$coord.'["building"~"."]);(._;>;);out;';
		$response = @file_get_contents( $url );
		file_put_contents( $fullPath.'/ways.json', $response );
	}
	$cache = file_get_contents( $fullPath.'/ways.json' );
	if( $cache != '' && strpos( $cache, 'Too Many Requests' ) === false ){
		echo utf8_decode( $cache );
	}else{
		unlink( $fullPath.'/ways.json' );
		echo '{
		  "version": 0.6,
		  "generator": "Overpass API",
		  "osm3s": {
			"timestamp_osm_base": "2016-02-11T22:14:01Z",
			"copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
		  },
		  "elements": [
		  ]
		}';
	}

}else if( isset( $_GET['overpass_surface'] ) ){
	$OVERPASS_SURFACES = json_decode( file_get_contents( dirname( __FILE__ ).'/../cfg_surfaces.json' ), true );
	
	$x = $_GET['tileX'];
	$y = $_GET['tileY'];
	$z = $_GET['zoom'];
	
	$dirName = 'cacheOverpassAreas';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x.'/'.$y;
	makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x, $y ) );
	
	if( $NO_CACHE || !is_file( $fullPath.'/ways.json' ) ){
	// if( true ){
		$startC = tileToCoords( $x, $y, $z );
		$endC = tileToCoords( $x + 1, $y + 1, $z );
		$south = $endC[1];
		$north = $startC[1];
		$east = $startC[0];
		$west = $endC[0];
		$coord = '('.$south.','.$east.','.$north.','.$west.')';
		$curServer = $serversOverpass[round( rand( 0, count( $serversOverpass ) - 1 ) )];
		$requete = '(';
		foreach( $OVERPASS_SURFACES as $model => $params ){
		
		
			if( is_array( $params['QUERY'] ) ){
				foreach( $params['QUERY'] as $subQuery ){
					$requete .= 'way'.$coord.''.$subQuery.';';
				}
				$requete = substr( $requete, 0, -1 );
			}else{
				$requete .= 'way'.$coord.''.$params['QUERY'].';';
			}
		}
		$requete .= ';way'.$coord.'["waterway"~"."];way'.$coord.'["natural"="water"]);(._;>;);';
			
		$url = $curServer.'/interpreter?data=[out:json];'.$requete.'out;';
		// exit( $url );
		$response = file_get_contents( $url );
		file_put_contents( $fullPath.'/ways.json', $response );
	}
	$cache = file_get_contents( $fullPath.'/ways.json' );
	if( $cache != '' && strpos( $cache, 'Too Many Requests' ) === false && strpos( $cache, 'failed' ) === false ){
		echo $cache;
	}else{
		unlink( $fullPath.'/ways.json' );
		echo '{
		  "version": 0.6,
		  "generator": "Overpass API",
		  "osm3s": {
			"timestamp_osm_base": "2016-02-11T22:14:01Z",
			"copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
		  },
		  "elements": [
		  ]
		}';
	}

}else if( isset( $_GET['overpass_obj'] ) ){
	$OVERPASS_OBJECTS = json_decode( file_get_contents( dirname( __FILE__ ).'/../cfg_models.json' ), true );
	
	if( isset( $OVERPASS_OBJECTS[$_GET['model']] ) ){
		$x = $_GET['tileX'];
		$y = $_GET['tileY'];
		$z = $_GET['zoom'];
		$startC = tileToCoords( $x, $y, $z );
		$endC = tileToCoords( $x + 1, $y + 1, $z );
		
		$model = $_GET['model'];
		$dirName = 'cacheOverpassNodes';
		$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x.'/'.$y;
		makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x, $y ) );
		
		if( !is_file( $fullPath.'/'.$model.'.json' ) ){
			$south = $endC[1];
			$north = $startC[1];
			$east = $startC[0];
			$west = $endC[0];
			$coord = '('.$south.','.$east.','.$north.','.$west.')';
			
			$url = 'http://www.overpass-api.de/api/interpreter?data=[out:json];(node'.$coord.''.$OVERPASS_OBJECTS[$model]['QUERY'].';);out;';
			$datas = file_get_contents( $url );
			file_put_contents( $fullPath.'/'.$model.'.json', $datas);
		}
		
		$cache = file_get_contents( $fullPath.'/'.$model.'.json' );
		if( $cache != '' ){
			echo $cache;
		}else{
			unlink( $fullPath.'/'.$model.'.json' );
			echo '{
			  "version": 0.6,
			  "generator": "Overpass API",
			  "osm3s": {
				"timestamp_osm_base": "2016-02-11T22:14:01Z",
				"copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
			  },
			  "elements": [
			  ]
			}';
		}
	}else{
		return json_encode( array( "elements"=>array() ) );
	}

}else if( isset( $_GET['nominatim'] ) ){
	$url = 'http://nominatim.openstreetmap.org/search?q='.$_GET['searchValue'].'&format=json&bounded=1&viewbox='.$_GET['left'].','.$_GET['top'].','.$_GET['right'].','.$_GET['bottom'].'';
	
	$res = file_get_contents( $url );
	echo $res;
	
	
}else if( isset( $_GET['tileEle'] ) ){
	$x = round($_GET['x']);
	$y = round($_GET['y']);
	$z = round($_GET['z']);
	getEleImg($x, $y, $z, 32);
	
	
}else if( isset( $_GET['tileOsm'] ) ){
	header('Content-type: image/png');
	$x = round( $_GET['x'] );
	$y = round( $_GET['y'] );
	$z = round( $_GET['z'] );
	if( is_numeric( $x ) && is_numeric( $y ) && is_numeric( $z ) ){
		$dirName = 'cache2dOsm';
		$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x;
		makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x ) );
		if( !is_file( $fullPath.'/'.$y.'.png' ) || filesize( $fullPath.'/'.$y.'.png' ) == 0 ){
			$url = 'http://c.tile.openstreetmap.org/'.$z.'/'.$x.'/'.$y.'.png';
			$image = file_get_contents( $url );
			file_put_contents( $fullPath.'/'.$y.'.png', $image);
		}
		readfile( $fullPath.'/'.$y.'.png' );
	}

}else if( isset( $_GET['tileMapbox'] ) ){
	header('Content-type: image/jpg');
	$x = round( $_GET['x'] );
	$y = round( $_GET['y'] );
	$z = round( $_GET['z'] );
	if( is_numeric( $x ) && is_numeric( $y ) && is_numeric( $z ) ){
		$dirName = 'cacheMapbox';
		$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x;
		makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x ) );
		if( !is_file( $fullPath.'/'.$y.'.png' ) ){
			$url = 'https://api.mapbox.com/v4/mapbox.satellite/'.$z.'/'.$x.'/'.$y.'.png32?access_token=pk.eyJ1IjoiYmFsb292YWwiLCJhIjoiY2lrMmF2d2FrMDJ6eHhia295MWFub3dsMiJ9._K2WzZ0dEZk0CyxvJCUfLQ';
			$image = file_get_contents( $url );
			file_put_contents( $fullPath.'/'.$y.'.png', $image);
		}
		readfile( $fullPath.'/'.$y.'.png' );
	}

	
}else if( isset( $_GET['3dtile'] ) ){
	header('Content-Type: application/json');
	$x = round( $_GET['x'] );
	$y = round( $_GET['y'] );
	$z = round( $_GET['z'] );
	if( is_numeric( $x ) && is_numeric( $y ) && is_numeric( $z ) ){
		
		$dirName = 'cacheBuildings';
		$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x;
		makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x ) );
		
		if( $NO_CACHE || !is_file( $fullPath.'/'.$y.'.json' ) ){
			$url = 'http://www.openearthview.net/3dtile.php?format=geojson&zoom='.$z.'&xtile='.$x.'&ytile='.$y;
			$datas = file_get_contents( $url );
			file_put_contents( $fullPath.'/'.$y.'.json', $datas);
		}
		readfile( $fullPath.'/'.$y.'.json' );
	}
	

}else if( isset( $_GET['overpass'] ) ){
	$x = $_GET['tileX'];
	$y = $_GET['tileY'];
	$z = $_GET['zoom'];
	$startC = tileToCoords( $x, $y, $z );
	$endC = tileToCoords( $x + 1, $y + 1, $z );
	
	$dirName = 'cacheModels';
	if( !is_dir( dirname( __FILE__ ).'/../'.$dirName.'' ) ){
		mkdir( dirname( __FILE__ ).'/../'.$dirName.'' );
	}
	if( !is_dir( dirname( __FILE__ ).'/../'.$dirName.'/'.$z ) ){
		mkdir( dirname( __FILE__ ).'/../'.$dirName.'/'.$z );
	}
	if( !is_dir( dirname( __FILE__ ).'/../'.$dirName.'/'.$z.'/'.$x ) ){
		mkdir( dirname( __FILE__ ).'/../'.$dirName.'/'.$z.'/'.$x );
	}

	
	if( !is_file( dirname( __FILE__ ).'/../'.$dirName.'/'.$z.'/'.$x.'/'.$y.'.json' ) ){
		$south = $endC[1];
		$north = $startC[1];
		$east = $startC[0];
		$west = $endC[0];
		
		$coord = '('.$south.','.$east.','.$north.','.$west.')';
		
		$url = 'http://www.overpass-api.de/api/interpreter?data=[out:json];(';
		$objToLoad = array( 'natural=tree', 'emergency=fire_hydrant', 'highway=street_lamp' );
		foreach( $objToLoad as $objTag ){
			$url .= 'node'.$coord.'['.$objTag.'];';
		}
		$url .= ');out;';
		
		$datas = file_get_contents( $url );
		file_put_contents( dirname( __FILE__ ).'/../'.$dirName.'/'.$z.'/'.$x.'/'.$y.'.json', $datas);
	}
	readfile( dirname( __FILE__ ).'/../'.$dirName.'/'.$z.'/'.$x.'/'.$y.'.json' );
	
	
}else if( isset( $_GET['elevation'] ) ){
	$lon = round( $_GET['lon'] );
	$lat = round( $_GET['lat'] );
	if( is_numeric( $lon ) && is_numeric( $lat ) ){
		// http://api.geonames.org/srtm3?lat=43.7421&lng=4.1807&username=demo
		$url = 'http://api.geonames.org/srtm3?lat='.$lat.'&lng='.$lon.'&username=demo';
		$res = file_get_contents( $url );
		echo $res;
	}
	

}else if( isset( $_GET['elevationMul'] ) ){
	$altitudes = array();
	$nb = $_GET['nb'];
	$result = 'OK';
	for( $i = 0; $i < $nb; $i ++ ){
		$lon = ( $_GET['lon_'.$i] );
		$lat = ( $_GET['lat_'.$i] );
		
		
		$dirName = 'cacheElevation';
		// $dirName = 'cacheElevation1Sec';
		$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$lon.'/'.$lat;
		makDirCache( array( CACHE_BASE_PATH, $dirName, $lon, $lat ) );
		
		if( !is_file( $fullPath.'/ele.json' ) ){
			$elevation = extractElevation( $lat, $lon );
			file_put_contents( $fullPath.'/ele.json', $elevation);
		}
		$elevation = file_get_contents( $fullPath.'/ele.json' );
		
		// $elevation = extractElevation( $lat, $lon );
		/*
		if( $elevation > 30000 ){
			$elevation = 0;
			$eleLog = fopen( dirname( __FILE__ ).'/elevation.log', "a" );
			fwrite( $eleLog, 'lat : '.$lat.' / lon : '.$lon.' : '.$elevation."\r\n" );
			fclose( $eleLog );
		}
		*/
		$altitudes[] = array( 'alt'=>$elevation );
	}
	$res = json_encode( array( 'RESULT'=>$result, 'NB'=>$nb, 'ALT'=>$altitudes ) );
	echo $res;
	
}else if( isset( $_GET['elevationTile'] ) ){
	echo getTileElevation( $_GET['tileX'], $_GET['tileY'], $_GET['zoom'], $_GET['def'], false );
	
	
}else if( isset( $_GET['overpassCustom'] ) ){
	$x = $_GET['tileX'];
	$y = $_GET['tileY'];
	$z = $_GET['zoom'];
	if (get_magic_quotes_gpc()==1) {
		$_GET['query'] = stripslashes($_GET['query']);
	}
	$query = urldecode( $_GET['query'] );
	$startC = tileToCoords( $x, $y, $z );
	$endC = tileToCoords( $x + 1, $y + 1, $z );
	$south = $endC[1];
	$north = $startC[1];
	$east = $startC[0];
	$west = $endC[0];
	$coord = '('.$south.','.$east.','.$north.','.$west.')';
	
	$url = 'http://www.overpass-api.de/api/interpreter?data=[out:json];node('.$south.','.$east.','.$north.','.$west.')'.$query.';out;';
	echo file_get_contents( $url );
	
}else if( isset( $_GET['gpx'] ) ){
	echo json_encode( parseGpx( $_GET['name'] ) );
	
	
}else if( isset( $_GET['getWeather'] ) ){
	echo getWeather( $_GET['x'], $_GET['y'], $_GET['z'], false );
	
}else if( isset( $_GET['drawEleImg'] ) ){
	drawHgtImg();
	
}else if( isset( $_GET['debugEle'] ) ){
	// extractElevationInterpolate( 37.1919, -90.6587 );
	// echo extractElevationInterpolate( -22.7187, 133.3617 );
	/*
	echo extractElevation( 45.1187, 4.3617 );
	echo '<br>';
	echo '<br>';
	echo extractElevation( 45.7187, 4.3617 );
	echo '<br>';
	echo '<br>';
	echo '<br>';
	
	echo extractElevation( -22.1187, 133.3617 );
	echo '<br>';
	echo extractElevation( -22.7187, 133.3617 );
	*/
	
	$z = 9;
	$x = 437;
	$y = 266;
	$def = 32;
	
	$img = imagecreatetruecolor( $def + 1, $def + 1 );
	
	$eleFactor = 0.3;
	
	$startC = tileToCoords( $x, $y, $z );
	$endC = tileToCoords( $x + 1, $y + 1, $z );

	$south = $endC[1];
	$north = $startC[1];
	$east = $startC[0];
	$west = $endC[0];
	
	$stepLat = ( $north - $south ) / $def;
	$stepLon = ( $west - $east ) / $def;

	$tmp = 0;
	
	$tmpX = 0;
	$tmpY = 0;
	for( $curLon = $east; $curLon <= $west; $curLon += $stepLon ){
		for( $i = 0; $i < $def + 1; $i ++ ){
			$curLat = ( $north - ( $i * $stepLat ) );
			$tmp ++;
			$elevation = extractElevation( $curLat, $curLon );
			// $elevation = extractElevationInterpolate( $curLat, $curLon );
			// echo '$elevation: '.$elevation.'<br>';
			
			$pixelEle = round( $elevation * $eleFactor );
			$color = imagecolorallocate( $img, $pixelEle, $pixelEle, $pixelEle );
			imagesetpixel($img, $tmpX, $tmpY, $color );
			
			$tmpY ++;
		}
		$tmpX ++;
		$tmpY = 0;
	}
	
	header("Content-type: image/png");
	imagepng($img);
	imagedestroy($img);
	
}
?>