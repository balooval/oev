<?php
define( 'CACHE_BASE_PATH', 'cache' );
define( 'NORMAL_FILE_PREFIX', 'test_7' );
// define( 'NORMAL_FILE_PREFIX', 'opti' );


function makDirCache( $_folders ){
	$path = dirname( __FILE__ ).'/..';
	foreach( $_folders as $folder ){
		$path .= '/'.$folder;
		if( !is_dir( $path ) ){
			@mkdir( $path );
		}
	}
}


function extractRgbAltTile($_x, $_y, $_z) {
	$DEBUG = true;
	// $DEBUG = false;
	$finalSize = 1201;
	$finalScale = 1;
	$srcRes = 1201;
	$rgbDir = dirname( __FILE__ ).'/../../srtm/srtm90rgb/';
	$startC = tileToCoords($_x, $_y, $_z);
	$endC = tileToCoords($_x + 1, $_y + 1, $_z);
	$south = $endC[1];
	$north = $startC[1];
	$west = $startC[0];
	$east = $endC[0];
	$topLeftFile = getEleFileFromCoord($north, $west);
	$topRightFile = getEleFileFromCoord($north, $east);
	$bottomLeftFile = getEleFileFromCoord($south, $west);
	$bottomRightFile = getEleFileFromCoord($south, $east);
	
	
	$startX = substr($topLeftFile, 0, strpos($topLeftFile, '.'));
	$startX = intval(substr($startX, -3));
	$endX = substr($topRightFile, 0, strpos($topRightFile, '.'));
	$endX = intval(substr($endX, -3));
	$endY = substr($topLeftFile, 1, 3);
	$endY = intval($endY);
	$startY = substr($bottomRightFile, 1, 3);
	$startY = intval($startY);
	$sideHor = substr($topLeftFile, 3, 1);
	$sideVer = substr($topLeftFile, 0, 1);
	
	$srcScaleX = abs($endX - $startX) + 1;
	$srcScaleY = abs($endY - $startY) + 1;
	$srcScale = max($srcScaleX, $srcScaleY);
	if ($DEBUG) {
		echo '$sideHor : ' . $sideHor . '<br />';
		echo '$sideVer : ' . $sideVer . '<br />';
		echo '$startX : ' . $startX . '<br />';
		echo '$endX : ' . $endX . '<br />';
		echo '$startY : ' . $startY . '<br />';
		echo '$endY : ' . $endY . '<br />';
		echo '<br />';
		echo '$srcScale : ' . $srcScale . '<br />';
		
		echo '<br />';
		echo 'north : ' . $north . '<br />';
		echo 'south : ' . $south . '<br />';
		echo 'west : ' . $west . '<br />';
		echo 'east : ' . $east . '<br />';
		echo $topLeftFile . '<br />';
		echo $topRightFile . '<br />';
		echo $bottomLeftFile . '<br />';
		echo $bottomRightFile . '<br />';
		echo '<br />';
	} else {
		$imgFinal = imagecreatetruecolor($finalSize, $finalSize);
	}
	for ($x = $startX; $x <= $endX; $x ++) {
		for ($y = $endY; $y >= $startY; $y --) {
			$srcFile = $sideVer . str_pad($y, 2, '0', STR_PAD_LEFT) . $sideHor . str_pad($x, 3, '0', STR_PAD_LEFT);
			$destPxlX = floor(($x - $startX) * ($srcRes / $srcScale));
			$destPxlY = abs(ceil(($y - $endY) * ($srcRes / $srcScale)));
			
			if ($DEBUG) {
				echo $x . ' / ' . $y . ' / ' . $srcFile . '<br />';
				echo '$destPxlX : ' . $destPxlX . '<br />';
				echo '$destPxlY : ' . $destPxlY . '<br />';
			} else {
				$imgSrc = imagecreatefrompng($rgbDir . $srcFile . '.hgt.png');
				imagecopyresampled($imgFinal, $imgSrc, $destPxlY, $destPxlX, 0, 0, $srcRes / $srcScale, $srcRes / $srcScale, $srcRes, $srcRes);
				// imagecopyresampled($imgFinal, $imgSrc, 0, 0, 0, 0, $srcRes / 1, $srcRes / 1, $srcRes, $srcRes);
			}
		}
	}
	if (!$DEBUG) {
		header('Content-Type: image/png');
		imagepng($imgFinal);
		return true;
	}
}

function processHgtToImg() {
	$srcDir = dirname( __FILE__ ).'/../../srtm/datas';
	$logPath = dirname( __FILE__ ).'/../../srtm/rgb_processed.log';
	
	$processedRgb = json_decode(file_get_contents($logPath), true);
	$hgtFiles = scandir($srcDir);
	$limit = 1000;
	$cur = 0;
	foreach ($hgtFiles as $hgtFile) {
		if ($hgtFile == '.' || $hgtFile == '..') {
			continue;
		}
		$treated = false;
		foreach ($processedRgb as $procRgb) {
			if ($hgtFile == $procRgb['file']) {
				$treated = true;
				break;
			}
		}
		if ($treated === false) {
			$cur ++;
			$res = hgtToImg($hgtFile);
			if ($res === true) {
				echo 'File "' . $hgtFile . '" proccessed<br />';
				$processedRgb[] = array('time' => date('U'), 'file' => $hgtFile);
				file_put_contents($logPath, json_encode($processedRgb, JSON_PRETTY_PRINT));
			} else {
				echo 'File "' . $hgtFile . '" failed<br />';
			}
			if ($cur >= $limit) {
				exit('Limit atteinte');
			}
		} else {
			echo 'File "' . $hgtFile . '" already proccessed<br />';
		}
	}
}

function hgtToImg($_hgtFile){
	set_time_limit(120);
	$destDir = dirname( __FILE__ ).'/../../srtm/srtm90rgb/';
	$measPerDeg = 1201; // 3 second data
	// $measPerDeg = 3601; // 1 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/' . $_hgtFile;
	if (!is_file( $hgtfile)) {
		echo 'File "' . $_hgtFile . '" not exist !';
		return false;
	}
	$fh = fopen($hgtfile, 'rb') or die('Error opening ' . $hgtfile . ', aborting!');
	if (($data = fread($fh, 2 * $measPerDeg * $measPerDeg)) === false) {
		echo "Datas can't be read !";
		return false;
	}
	$imgAlt = imagecreatetruecolor($measPerDeg, $measPerDeg);
	$offset = 0;
	$errNb = 0;
	$lastGoodAlt = 0;
	$altMin = 10000;
	$altMax = 0;
	for ($x = 0; $x < $measPerDeg; $x ++) {
		for ($y = 0; $y < $measPerDeg; $y ++) {
			$bin = substr($data, $offset, 2);
			$alt = reset(unpack("n*", $bin));
			if ($alt < 10000) {
				$lastGoodAlt = $alt;
			}
			if ($lastGoodAlt < $altMin) {
				$altMin = $lastGoodAlt;
			}
			if ($lastGoodAlt > $altMax) {
				$altMax = $lastGoodAlt;
			}
			$offset += 2;
		}
	}
	$altRatio = $altMax - $altMin;
	$offset = 0;
	$lastGoodAlt = 0;
	for ($x = 0; $x < $measPerDeg; $x ++) {
		for ($y = 0; $y < $measPerDeg; $y ++) {
			$bin = substr($data, $offset, 2);
			$alt = reset(unpack("n*", $bin));
			if ($alt < 10000) {
				$lastGoodAlt = $alt;
			}
			$red = floor($lastGoodAlt / 256);
			$green = $lastGoodAlt - ($red * 256);
			$blue = floor((($lastGoodAlt - $altMin) / $altRatio) * 256);
			$pixColor = imagecolorallocate($imgAlt, $red, $green, $blue);
			imagesetpixel($imgAlt, $x, $y, $pixColor);
			$offset += 2;
		}
	}
	fclose($fh);
	// header('Content-Type: image/png');
	imagepng($imgAlt, $destDir . $_hgtFile . '.png', 9);
	imagedestroy($imgAlt);
	return true;
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

// http://val.openearthview.net/libs/remoteImg.php?tileNormal=1&z=11&x=1045&y=749&def=64 // sete
// getNormImg(1045, 749, 11, 64);  // sete
// makeNormalEle(8362, 5971, 14, 32);
// getEleImg(8362, 5971, 14, 32);

function extractAltFromColor($_rgb) {
	$r = ($_rgb >> 16) & 0xFF;
	$g = ($_rgb >> 8) & 0xFF;
	$b = $_rgb & 0xFF;
	$alt = $r * 256 + $b;
	return $alt;
}

function getNormImg($_x, $_y, $_z, $_def) {
	$USE_CACHE = true;
	$dirName = 'cacheNormImg';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$_z.'/'.$_x.'/'.$_y;
	
	$filePrefix = '';
	if ($_z > 12) {
		// $filePrefix = 'interpolate_';
	}
	
	if(!$USE_CACHE || !is_file($fullPath.'/' . $filePrefix . NORMAL_FILE_PREFIX . '_' . $_def . '.png')){
		makeNormalEle($_x, $_y, $_z, $_def);
	}
	header('Content-Type: image/png');
	readfile($fullPath.'/' . $filePrefix . NORMAL_FILE_PREFIX  .'_' . $_def . '.png');
}

function normalGetAlt($_lat, $_lon, $_interpolate=false) {
	$dirName = 'cacheElevation';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$_lat.'/'.$_lon;
	makDirCache( array( CACHE_BASE_PATH, $dirName, $_lat, $_lon ) );
	$fileCached = 'ele';
	if( $_interpolate ){
		$fileCached .= '_interpolate';
	}
	if (!is_file($fullPath.'/' . $fileCached . '.json')) {
		if ($_interpolate) {
			$alt = extractElevationInterpolate($_lat, $_lon);
		} else {
			$alt = extractElevation($_lat, $_lon);
		}
		file_put_contents($fullPath.'/' . $fileCached . '.json', $alt);
	}
	$alt = file_get_contents( $fullPath.'/' . $fileCached . '.json' );
	$alt = max(-100, min(9000, $alt));
	return $alt;
}


function makeNormalEle($_x, $_y, $_z, $_def) {
	set_time_limit(60);
	$startC = tileToCoords($_x, $_y, $_z);
	$endC = tileToCoords($_x + 1, $_y + 1, $_z);
	$south = $endC[1];
	$north = $startC[1];
	$east = $startC[0];
	$west = $endC[0];
	$stepLat = ( $north - $south ) / $_def;
	$stepLon = ( $west - $east ) / $_def;
	$step = 0;
	$pixX = 0;
	$pixY = 0;
	$imgNor = imagecreatetruecolor($_def, $_def);
	
	$filePrefix = '';
	$interpolate = false;
	if ($_z > 12) {
		// $interpolate = true;
		// $filePrefix = 'interpolate_';
	}
	
	$storedMaxLen = 1;
	$storedVect = array();
	for( $curLon = $east; $curLon < $west; $curLon += $stepLon ){
		$storedVect[$pixX] = array();
		for( $i = 0; $i < $_def; $i ++ ){
			$curLat = ($north - (($i - 1) * $stepLat));
			$altXA = normalGetAlt($curLat, $curLon, $interpolate);
			$curLat = ($north - (($i + 1) * $stepLat));
			$altXB = normalGetAlt($curLat, $curLon, $interpolate);
			$curLat = ($north - ($i * $stepLat));
			$altYA = normalGetAlt($curLat, $curLon - $stepLon, $interpolate);
			$altYB = normalGetAlt($curLat, $curLon + $stepLon, $interpolate);
			$vecX = array(
				'x' => 0, 
				'y' => 1, 
				'z' => $altXA - $altXB, 
			);
			$vecY = array(
				'x' => 1, 
				'y' => 0, 
				'z' => $altYA - $altYB, 
			);
			$vectFinalX = array(
				'x' => ($vecX['y'] * $vecY['z']) - ($vecX['z'] * $vecY['y']), 
				'y' => ($vecX['z'] * $vecY['x']) - ($vecX['x'] * $vecY['z']), 
				'z' => ($vecX['x'] * $vecY['y']) - ($vecX['y'] * $vecY['x']), 
				'length' => 0
			);
			$vectLen = sqrt($vectFinalX['x'] * $vectFinalX['x'] + $vectFinalX['y'] * $vectFinalX['y']);
			$vectFinalX['length'] = $vectLen;
			if ($storedMaxLen < $vectLen) {
				$storedMaxLen = $vectLen;
			}
			$storedVect[$pixX][$pixY] = $vectFinalX;
			$pixY ++;
		}
		$pixX ++;
		$pixY = 0;
	}
	for ($x = 0; $x < $_def; $x ++) {
		for ($y = 0; $y < $_def; $y ++) {
			$vect = $storedVect[$x][$y];
			$vect['x'] /= $storedMaxLen;
			$vect['y'] /= $storedMaxLen;
			$vect['z'] /= $storedMaxLen;
			$red = round((($vect['x'] + 1) / 2) * 255);
			$green = round((($vect['y'] + 1) / 2) * 255);
			$blue = round((($vect['z'] + 1) / 2) * 255);
			$pixColor = imagecolorallocate($imgNor, $red, $green, 255);
			imagesetpixel($imgNor, $x, $y, $pixColor);
		}
	}
	header('Content-Type: image/png');
	$dirName = 'cacheNormImg';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$_z.'/'.$_x.'/'.$_y;
	makDirCache(array(CACHE_BASE_PATH, $dirName, $_z, $_x, $_y));
	imagepng($imgNor, $fullPath.'/' . $filePrefix . NORMAL_FILE_PREFIX . '_' . $_def . '.png', 9);
	imagedestroy($imgNor);
}


function getEleImg($_x, $_y, $_z, $_def) {
	$USE_CACHE = true;
	// $USE_CACHE = false;
	$dirName = 'cacheEleImg';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$_z.'/'.$_x.'/'.$_y;
	if(!$USE_CACHE || !is_file($fullPath.'/' . ($_def + 1) . '.png')){
		makeEleBmp($_x, $_y, $_z, $_def);
	}
	
	header('Content-Type: image/png');
	// echo file_get_contents($fullPath.'/' . $_def . '.png');
	readfile($fullPath.'/' . ($_def + 1) . '.png');
}

// write bmp image from elevation
function makeEleBmp($_x, $_y, $_z, $_def) {
	$startC = tileToCoords($_x, $_y, $_z);
	$endC = tileToCoords($_x + 1, $_y + 1, $_z);
	$south = $endC[1];
	$north = $startC[1];
	$east = $startC[0];
	$west = $endC[0];
	$stepLat = ( $north - $south ) / $_def;
	$stepLon = ( $west - $east ) / $_def;
	$step = 0;
	$imgEle = imagecreatetruecolor($_def + 1, $_def + 1);
	$pixX = 0;
	$pixY = 0;
	$elevation = 0;
	for( $curLon = $east; $curLon <= $west; $curLon += $stepLon ){
		for( $i = 0; $i <= $_def; $i ++ ){
			$curLat = ( $north - ( $i * $stepLat ) );
			$tmpElevation = extractElevation( $curLat, $curLon );
			if ($tmpElevation < 10000) {
				$elevation = $tmpElevation;
			}
			$step ++;
			$red = floor($elevation / 256);
			$blue = $elevation - ($red * 256);
			$green = 0;
			$pixColor = imagecolorallocate($imgEle, $red, $green, $blue);
			imagesetpixel($imgEle, $pixX, $pixY, $pixColor);
			$pixY ++;
		}
		$pixX ++;
		$pixY = 0;
	}
	$dirName = 'cacheEleImg';
	$fullPath = dirname( __FILE__ ).'/../'.CACHE_BASE_PATH.'/'.$dirName.'/'.$_z.'/'.$_x.'/'.$_y;
	makDirCache(array(CACHE_BASE_PATH, $dirName, $_z, $_x, $_y));
	header('Content-Type: image/png');
	// imagepng($imgEle, $fullPath.'/' . $_def . '.png', 9);
	imagepng($imgEle, $fullPath.'/' . ($_def + 1) . '.png', 9);
	imagedestroy($imgEle);
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
			if (strpos( $elevation, 'ERR' ) !== false) {
				unlink($fullPath.'/'.$fileCached.'.json');
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

function tileToCoords($_tile_x, $_tile_y, $_zoom) {
	$p = array(0, 0);
	$n = pi() - ((2.0 * pi() * $_tile_y) / pow(2.0, $_zoom));
	$p[0] = (($_tile_x / pow(2.0, $_zoom) * 360.0) - 180.0);
	$p[1] = (180.0 / pi() * atan(sinh($n)));
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


function getEleFileFromCoord($_lat, $_lon) {
	$fileName = '';
	if( $_lat > 0 ){
		$fileName .= 'N'.str_pad( floor( $_lat-0.0001 ), 2, '0', STR_PAD_LEFT );
	}else{
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


// echo extractElevationTest(43.7403, 4.1792);

function extractElevation( $_lat, $_lon ){
// function extractElevationTest( $_lat, $_lon ){
	set_time_limit(30);
	$measPerDeg = 1201; // 3 second data
	// $measPerDeg = 3601; // 1 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/'.getEleFileFromCoord( $_lat, $_lon );
	if (!is_file( $hgtfile)) {
		return 0;
	}
	$fh = fopen($hgtfile, 'rb') or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
		$starty = -$starty;
	}
	$startx = +substr($hgtfile, 4, 3);
	if (substr($hgtfile, 3, 1) == "W") {
		$startx = -$startx;
	}
	$colStep = 1 / $measPerDeg;
	$colDest = floor((($starty + 1) - $_lat) / $colStep);
	$rowDest = floor(($_lon - $startx) / $colStep);
	$offset = $colDest * (2 * $measPerDeg);
	$offset += $rowDest * 2;
	fseek($fh, $offset);
	$tmp = fread($fh, 2);
	$res = reset(unpack("n*", $tmp));
	if ($res > 30000) {
		$offset = max(0, $offset - 2 * 50);
		for ($i = 0; $i < 100; $i ++) {
			if ($res > 30000) {
				$offset += 2;
				fseek($fh, $offset);
				$tmp = fread($fh, 2);
				$res = reset(unpack("n*", $tmp));
			} else {
				break;
			}
		}
	}
	fclose($fh);
	return $res;
}

function extractElevationOk( $_lat, $_lon ){
	set_time_limit(30);
	$measPerDeg = 1201; // 3 second data
	// $measPerDeg = 3601; // 1 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/'.getEleFileFromCoord( $_lat, $_lon );
	if (!is_file( $hgtfile)) {
		return 0;
	}
	$fh = fopen($hgtfile, 'rb') or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
		$starty = -$starty;
	}
	$startx = +substr($hgtfile, 4, 3);
	if (substr($hgtfile, 3, 1) == "W") {
		$startx = -$startx;
	}
	
	if ($data = fread($fh, 2 * $measPerDeg * $measPerDeg)) {
		$hgtfile = basename( $hgtfile, '.hgt' );
		$colStep = 1 / $measPerDeg;
		$colDest = floor((($starty + 1) - $_lat) / $colStep);
		if (substr ($hgtfile, 0, 1) == "S") {
			$colDest = floor((($starty + 1 ) - $_lat) / $colStep);
		}
		$rowDest = floor(($_lon - $startx) / $colStep);
		$offset = $colDest * (2 * $measPerDeg);
		$offset += $rowDest * 2;
		for ($j = $rowDest; $j< $measPerDeg; $j++) {
			$short = substr($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if ($shorts < 30000) {
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

function extractElevationInterpolate( $_lat, $_lon) {
	set_time_limit(60);
	// $measPerDeg = 3601; // 1 second data
	$measPerDeg = 1201; // 3 second data
	$hgtfile = dirname( __FILE__ ).'/../../srtm/datas/'.getEleFileFromCoord( $_lat, $_lon );
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
		$colDest = ( ( ( $starty + 1 ) - $_lat ) / $colStep );
		$colFloor = floor( ( ( $starty + 1 ) - $_lat ) / $colStep );
		$colCeil = ceil( ( ( $starty + 1 ) - $_lat ) / $colStep );
		$rowDest = ( ( abs($_lon - $startx) ) / $colStep );
		$rowFloor = ( floor( ( abs( $_lon - $startx) ) / $colStep ) );
		$rowCeil = ( ceil( ( abs($_lon - $startx) ) / $colStep ) );
		$eleTopLeft = 0;
		$eleBottomLeft = 0;
		$eleTopRight = 0;
		$eleBottomRight = 0;
		$offset = $colFloor * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowFloor * 2;
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
		for( $j = $rowCeil; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				$eleBottomLeft = $shorts;
				break;
			}else{
				// echo 'incorrect eleBottomLeft<br>';
			}
			$offset += 2;
		}
		$offset = $colCeil * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowFloor * 2;
		for( $j = $rowFloor; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				$eleTopRight = $shorts;
				break;
			}else{
				// echo 'incorrect eleTopRight<br>';
			}
			$offset += 2;
		}
		$offset = $colCeil * ( 2 * ( $measPerDeg - 0 ) );
		$offset += $rowCeil * 2;
		for( $j = $rowCeil; $j< $measPerDeg; $j++) {
			$short = substr ($data, $offset, 2);
			$shorts = reset(unpack("n*", $short));
			if( $shorts < 30000 ){
				$eleBottomRight = $shorts;
				break;
			}else{
				// echo 'incorrect eleBottomRight<br>';
			}
			$offset += 2;
		}
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
	} else {
		echo "Could not read file!\n";
	}
	fclose($fh);
	return 0;
}




function parseGpx( $_gpxFilename ){
	$gpxPts = array();
	$xml = simplexml_load_file( dirname( __FILE__).'/../assets/gpx/'.$_gpxFilename.'.gpx' );
	
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