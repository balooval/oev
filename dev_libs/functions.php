<?php
define( 'CACHE_BASE_PATH', 'cache' );


function makDirCache( $_folders ){
	$path = dirname( __FILE__ ).'/..';
	foreach( $_folders as $folder ){
		$path .= '/'.$folder;
		if( !is_dir( $path ) ){
			@mkdir( $path );
		}
	}
}



function getWeather( $_x, $_y, $_z, $_noCache=false ){	
	$NO_CACHE = $_noCache;
	
	$x = $_x;
	$y = $_y;
	$z = $_z;
	
	$dirName = 'cacheWeather';
	$fileName = $y;
	
	$startC = tileToCoords( $x, $y, $z );
	$endC = tileToCoords( $x + 1, $y + 1, $z );

	$centerLon = ( $endC[0] + $startC[0] ) / 2;
	$centerLat = ( $endC[1] + $startC[1] ) / 2;
	
	// $url = 'http://api.openweathermap.org/data/2.5/weather?lat='.$centerLat.'&lon='.$centerLon.'&units=metric&appid=08d6047ad38c47b1aea2100d8d827e34';
	// return $url;
	
	
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$z.'/'.$x;
	makDirCache( array( CACHE_BASE_PATH, $dirName, $z, $x ) );
	
	if( is_file( $fullPath.'/'.$fileName.'.json' ) ){
		if( filemtime( $fullPath.'/'.$fileName.'.json' ) < time() - ( 60 * 30 ) ){
			$NO_CACHE = true;
		}
	}
	
	if( $NO_CACHE || !is_file( $fullPath.'/'.$fileName.'.json' ) ){
		$url = 'http://api.openweathermap.org/data/2.5/weather?lat='.$centerLat.'&lon='.$centerLon.'&units=metric&appid=08d6047ad38c47b1aea2100d8d827e34';
		$datas = file_get_contents( $url );
		file_put_contents( $fullPath.'/'.$fileName.'.json', $datas );
	}
	$weather = file_get_contents( $fullPath.'/'.$fileName.'.json' );
	
	return $weather;
}





function getTileElevation( $_x, $_y, $_z, $_def, $_noCache=false ){
	$altitudes = array();
	$result = 'OK';
	
	$NO_CACHE = $_noCache;
	
	$x = $_x;
	$y = $_y;
	$z = $_z;
	$def = $_def;
	
	$useInterpolation = false;
	$useInterpolation = true;
	
	$fileCached = 'ele';
	if( $useInterpolation ){
		$fileCached .= '_interpolate';
	}
	
	
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
			$dirName = 'cacheElevation';
			$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$curLat.'/'.$curLon;
			makDirCache( array( CACHE_BASE_PATH, $dirName, $curLat, $curLon ) );
			
			if( $NO_CACHE || !is_file( $fullPath.'/'.$fileCached.'.json' ) ){
				if( $useInterpolation ){
					$elevation = extractElevationInterpolate( $curLat, $curLon );
				}else{
					$elevation = extractElevation( $curLat, $curLon );
				}
				file_put_contents( $fullPath.'/'.$fileCached.'.json', $elevation);
			}
			$elevation = file_get_contents( $fullPath.'/'.$fileCached.'.json' );
			if( strpos( $elevation, 'ERR' ) !== false ){
				unlink( $fullPath.'/'.$fileCached.'.json' );
				$elevation = 0;
			}
			
			$altitudes[] = $elevation;
			$tmpY ++;
		}
		$tmpX ++;
		$tmpY = 0;
	}
	$res = json_encode( array( 'RESULT'=>$result, 'NB'=>$tmp, 'ALT'=>$altitudes ) );
	return $res;
}

function tileToCoords( $_tile_x, $_tile_y, $_zoom){
	$p = array( 0, 0 );
	$n = pi() - ( (2.0 * pi() * $_tile_y ) / pow( 2.0, $_zoom ) );
	$p[0] = ( ( $_tile_x / pow( 2.0, $_zoom ) * 360.0 ) - 180.0 );
	$p[1] = (180.0 / pi() * atan( sinh( $n ) ) );
	return $p;
}

function drawHgtImg(){
	$measPerDeg = 1201; // 3 second data
	// $hgtfile = dirname( __FILE__ ).'/../../srtm/datas/N37W091.hgt';
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/S23E133.hgt';
	// $measPerDeg = 3601; // 1 second data
	if( !is_file( $hgtfile ) ){
		echo 'hgt not exist<br>';
	}
	$fh = fopen( $hgtfile, 'rb' ) or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
		$starty = -$starty;
	}
	$startx = +substr ($hgtfile, 4, 3);
	if (substr ($hgtfile, 3, 1) == "W") {
		$startx = -$startx;
	}
	
	$datasJump = 1;
	$img = imagecreatetruecolor( $measPerDeg / $datasJump, $measPerDeg / $datasJump );
	$eleFactor = 0.2;
	
	if( $data = fread( $fh, 2 * $measPerDeg * $measPerDeg ) ){
		$hgtfile = basename( $hgtfile, '.hgt' );
		$offset = 0;
		$tmpX = 0;
		$tmpY = 0;
		for ($i = 0; $i< $measPerDeg; $i+= $datasJump) {
			for ($j = 0; $j< $measPerDeg; $j+= $datasJump) {
				$short = substr ($data, $offset, 2);
				$shorts = reset(unpack("n*", $short));
				if( $shorts < 30000 ){
					$pixelEle = round( $shorts * $eleFactor );
				}else{
					$pixelEle = 0;
				}
				$color = imagecolorallocate( $img, $pixelEle, $pixelEle, $pixelEle );
				imagesetpixel($img, $tmpY, $tmpX, $color );
				$offset += 2 * $datasJump;
				$tmpY ++;
			}
			$tmpX ++;
			$tmpY = 0;
		}
	} else echo "Could not read file!\n";
	fclose($fh);
	
	
	header("Content-type: image/png");
	imagepng( $img );
	imagedestroy( $img );
}


function getEleFileFromCoord( $_lat, $_lon ){
	$fileName = '';
	if( $_lat > 0 ){
		$fileName .= 'N'.str_pad( floor( $_lat-0.0001 ), 2, '0', STR_PAD_LEFT );
	}else{
		// $fileName .= 'S'.str_pad( floor( abs( $_lat-0.0001 ) ), 2, '0', STR_PAD_LEFT );
		$fileName .= 'S'.str_pad( ceil( abs( $_lat+0.0001 ) ), 2, '0', STR_PAD_LEFT );
	}
	if( $_lon > 0 ){
		$fileName .= 'E'.str_pad( floor( $_lon ), 3, '0', STR_PAD_LEFT );
	}else{
		$fileName .= 'W'.str_pad( floor( abs( $_lon - 1 ) ), 3, '0', STR_PAD_LEFT );
	}
	$fileName .= '.hgt';
	return $fileName;
}



function extractElevation( $_lat, $_lon ){
	$measPerDeg = 1201; // 3 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/'.getEleFileFromCoord( $_lat, $_lon );
	// $measPerDeg = 3601; // 1 second data
	if( !is_file( $hgtfile ) ){
		return 0;
	}
	$fh = fopen( $hgtfile, 'rb' ) or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
		$starty = -$starty;
	}
	$startx = +substr ($hgtfile, 4, 3);
	if (substr ($hgtfile, 3, 1) == "W") {
		$startx = -$startx;
	}
	if( $data = fread( $fh, 2 * $measPerDeg * $measPerDeg ) ){
		$hgtfile = basename( $hgtfile, '.hgt' );
		$colStep = 1 / $measPerDeg;
		// OK
		$colDest = floor( ( ( $starty + 1 ) - $_lat ) / $colStep );
		
		
		if (substr ($hgtfile, 0, 1) == "S") {
			$colDest = floor( ( ( $starty + 1 ) - $_lat ) / $colStep );
		}
		/*
		echo '$hgtfile: '.$hgtfile.'<br>';
		echo '$_lat: '.$_lat.'<br>';
		// echo '$_lon: '.$_lon.'<br>';
		echo '$starty: '.$starty.'<br>';
		echo '$colDest: '.$colDest.'<br>';
		echo '( ( $starty + 1 ) - $_lat ): '.( ( $starty + 1 ) - $_lat ).'<br>';
		*/
		// echo '$_lat - ( $starty + 0 ): '.( $_lat - ( $starty -1 ) ).'<br>';
		// echo 'A $colDest: '.$colDest.'<br>';
		// $colDest = floor( ( ( $starty + 1 ) - $_lat ) / $colStep );
		// echo 'A $colDest: '.$colDest.'<br>';
		// $rowDest = ( ( abs($_lon - $startx) ) / $colStep );
		
		
		
		
		$rowDest = floor( ( $_lon - $startx ) / $colStep );
		$offset = $colDest * ( 2 * $measPerDeg );
		$offset += $rowDest * 2;
		
		// echo '$offset: '.$offset.'<br>';
		
		for ($j = $rowDest; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				return $shorts;
			}
			$offset += 2;
		}
	} else echo "Could not read file!\n";
	fclose($fh);
	return 0;
}


function queryEleDist( $_lat, $_lon ){
	// $url = 'http://api.geonames.org/srtm3?lat='.$_lat.'&lng='.$_lon.'&username=balooval';
	$url = 'http://api.geonames.org/astergdem?lat='.$_lat.'&lng='.$_lon.'&username=balooval';
	$datas = file_get_contents( $url );
	return $datas;
}

function extractElevationInterpolate( $_lat, $_lon ){
	/*
	$measPerDeg = 3601; // 1 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas_1/'.getEleFileFromCoord( $_lat, $_lon );
	if( !is_file( $hgtfile ) ){
		$measPerDeg = 1201; // 3 second data
		$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/'.getEleFileFromCoord( $_lat, $_lon );
		// echo '$hgtfile: '.$hgtfile.'<br>';
		if( !is_file( $hgtfile ) ){
			return 0;
			// return queryEleDist( $_lat, $_lon );
		}
	}
	*/
	$measPerDeg = 1201; // 3 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/'.getEleFileFromCoord( $_lat, $_lon );
	// echo '$hgtfile: '.$hgtfile.'<br>';
	if( !is_file( $hgtfile ) ){
		return 0;
		// return queryEleDist( $_lat, $_lon );
	}

	
	$fh = fopen( $hgtfile, 'rb' ) or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
		$starty = -$starty;
	}
	$startx = +substr ($hgtfile, 4, 3);
	if (substr ($hgtfile, 3, 1) == "W") {
		$startx = -$startx;
	}
	if( $data = fread( $fh, 2 * $measPerDeg * $measPerDeg ) ){
		$hgtfile = basename( $hgtfile, '.hgt' );
		
		$colStep = 1 / $measPerDeg;

		
		// OK
		
		$colDest = ( ( ( $starty + 1 ) - $_lat ) / $colStep );
		$colFloor = floor( ( ( $starty + 1 ) - $_lat ) / $colStep );
		$colCeil = ceil( ( ( $starty + 1 ) - $_lat ) / $colStep );
		/*
		if (substr ($hgtfile, 0, 1) == "S") {
			$colDest = ( ( ( $starty - 1 ) - $_lat ) / $colStep );
			$colFloor = floor( ( ( $starty - 1 ) - $_lat ) / $colStep );
			$colCeil = ceil( ( ( $starty - 1 ) - $_lat ) / $colStep );
		}
		*/
		
		/*
		// OK
		$rowDest = ( ( $_lon - abs($startx) ) / $colStep );
		$rowFloor = ( floor( ( $_lon - abs($startx) ) / $colStep ) );
		$rowCeil = ( ceil( ( $_lon - abs($startx) ) / $colStep ) );
		*/
		
		$rowDest = ( ( abs($_lon - $startx) ) / $colStep );
		$rowFloor = ( floor( ( abs( $_lon - $startx) ) / $colStep ) );
		$rowCeil = ( ceil( ( abs($_lon - $startx) ) / $colStep ) );
		/*
		echo '<br>';
		echo '$hgtfile: '.$hgtfile.'<br>';
		echo '$_lat: '.$_lat.'<br>';
		echo '$starty: '.$starty.'<br>';
		echo '( $starty + 1 ): '.( $starty + 1 ).'<br>';
		echo '( ( $starty + 1 ) - $_lat ): '.( ( $starty + 1 ) - $_lat ).'<br>';
		echo '$colDest: '.$colDest.'<br>';
		echo '$colFloor: '.$colFloor.'<br>';
		echo '$colCeil: '.$colCeil.'<br>';
		echo '$_lon: '.$_lon.'<br>';
		echo '$startx: '.$startx.'<br>';
		echo '( $_lon - $startx ): '.( $_lon - $startx ).'<br>';
		echo '$rowDest: '.$rowDest.'<br>';
		echo '$rowFloor: '.$rowFloor.'<br>';
		echo '$rowCeil: '.$rowCeil.'<br>';
		*/
		$eleTopLeft = 0;
		$eleBottomLeft = 0;
		$eleTopRight = 0;
		$eleBottomRight = 0;
		
		$offset = $colFloor * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowFloor * 2;
		// echo '$offset: '.$offset.'<br>';
		for( $j = $rowFloor; $j< $measPerDeg; $j++) {
			$short = substr( $data, $offset, 2 );
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				// echo 'found eleTopLeft<br>';
				$eleTopLeft = $shorts;
				break;
			}else{
				// echo 'incorrect eleTopLeft<br>';
			}
			$offset += 2;
		}
		
		$offset = $colFloor * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowCeil * 2;
		// echo '$offset: '.$offset.'<br>';
		for( $j = $rowCeil; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				// echo 'found eleBottomLeft<br>';
				$eleBottomLeft = $shorts;
				break;
			}else{
				// echo 'incorrect eleBottomLeft<br>';
			}
			$offset += 2;
		}
		
		$offset = $colCeil * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowFloor * 2;
		// echo '$offset: '.$offset.'<br>';
		for( $j = $rowFloor; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				// echo 'found eleTopRight<br>';
				$eleTopRight = $shorts;
				break;
			}else{
				// echo 'incorrect eleTopRight<br>';
			}
			$offset += 2;
		}

		$offset = $colCeil * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowCeil * 2;
		// echo '$offset: '.$offset.'<br>';
		for( $j = $rowCeil; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				// echo 'found eleBottomRight<br>';
				$eleBottomRight = $shorts;
				break;
			}else{
				// echo 'incorrect eleBottomRight<br>';
			}
			$offset += 2;
		}
		/*
		echo 'eleTopLeft : '.$eleTopLeft.'<br>';
		echo 'eleBottomLeft : '.$eleBottomLeft.'<br>';
		echo 'eleTopRight : '.$eleTopRight.'<br>';
		echo 'eleBottomRight : '.$eleBottomRight.'<br>';
		*/
		
		if( $colCeil == $colFloor ){
			$R1 = $eleTopLeft;
			$R2 = $eleBottomLeft;
		}else{
			$R1 = (($colCeil - $colDest )/($colCeil - $colFloor))*$eleTopLeft + (( $colDest - $colFloor)/($colCeil - $colFloor))*$eleTopRight;
			$R2 = (($colCeil - $colDest )/($colCeil - $colFloor))*$eleBottomLeft + (( $colDest - $colFloor)/($colCeil - $colFloor))*$eleBottomRight;
		}
		
		if( $rowCeil == $rowFloor ){
			$P = $R1;
		}else{
			$P = (($rowCeil - $rowDest)/($rowCeil - $rowFloor))*$R1 + (($rowDest - $rowFloor)/($rowCeil - $rowFloor))*$R2;
		}
		return round( $P );
		
	} else echo "Could not read file!\n";
	fclose($fh);
	
	return 0;
}




function parseGpx( $_gpxFilename ){
	$gpxPts = array();
	$xml = simplexml_load_file( dirname( __FILE__).'/../gpx/'.$_gpxFilename.'.gpx' );
	
	foreach($xml->children() as $trk) {
		foreach($trk->children() as $trkseg) {
			if( $trkseg->getName() == 'trkseg' ){
				foreach($trkseg->children() as $trkpt) {
					
					// 2014-07-23T07:44:27Z
					$gpxTime = $trkpt->time;
					// echo $gpxTime.'<br>';
					$jsonTime = explode( 'T', $gpxTime );
					// echo $jsonTime[1].'<br>';
					$jsonTime = explode( ':', $jsonTime[1] );
					// echo $jsonTime[0].' / '.$jsonTime[1].' / '.substr( $jsonTime[2], 0, -1 ).'<br>';
					$jsonTime = substr( $jsonTime[2], 0, -1 ) + ( $jsonTime[1] * 60 ) + ( $jsonTime[0] * 60 * 60 );
					// echo $jsonTime.'<br>';
					$gpxPts[] = array( "time"=>$jsonTime, "lon"=>$trkpt['lon'], "lat"=>$trkpt['lat'], "ele"=>$trkpt[0]->ele );
				}
			}
		}
	}
	return $gpxPts;
}

function logIp(){
	if( $_SERVER['REMOTE_ADDR'] != '78.221.127.155' ){
		$fp = fopen( dirname( __FILE__ ).'/ip_azeipssdkjhkjdsj.log', 'a+');
		fwrite( $fp, date( 'Y-m-d H:i:s' ).' / '.$_SERVER['REMOTE_ADDR']."\r\n" );
		fclose($fp);
	}
}
?>