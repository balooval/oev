<?php
echo 'Elevation : '.extractElevation( 43.9970, 3.0052 ).'<br>';
// echo 'Elevation : '.extractElevation( 43.998333333333, 3.0052 ).'<br>';


// echo getFileFromCoord( 43.9970, 3.0052 );

 // gdal_translate -of SRTMHGT n43_e003_1arc_v3.tif n43_e003_1arc_v3.hgt



function getFileFromCoord( $_lat, $_lon ){
	$fileName = '';
	if( $_lat > 0 ){
		$fileName .= 'N'.str_pad( floor( $_lat ), 2, '0', STR_PAD_LEFT );
	}else{
		$fileName .= 'S'.str_pad( floor( abs( $_lat ) ), 2, '0', STR_PAD_LEFT );
	}
	if( $_lon > 0 ){
		$fileName .= 'E'.str_pad( floor( $_lon ), 3, '0', STR_PAD_LEFT );
	}else{
		$fileName .= 'W'.str_pad( floor( abs( $_lon ) ), 3, '0', STR_PAD_LEFT );
	}
	
	$fileName .= '.hgt';
	return $fileName;
}


function extractElevation( $_lat, $_lon ){
	// $measPerDeg = 1201; // 3 second data
	$measPerDeg = 3601; // 1 second data
	$hgtfile = "../srtm/N43E003.hgt";
	// $hgtfile = '../srtm/datas/'.getFileFromCoord( $_lat, $_lon );

	$fh = fopen($hgtfile, 'rb') or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
		$starty = -$starty;
	}
	$startx = +substr ($hgtfile, 4, 3);
	if (substr ($hgtfile, 3, 1) == "W") {
		$startx = -$startx;
	}

	if ($data = fread($fh, 2 * $measPerDeg * $measPerDeg)) {
		$offset = 0;
		$hgtfile = basename( $hgtfile, '.hgt' );
		for ($i = 0; $i < $measPerDeg; $i++) {
			$curLat = $starty + 1 - $i / ( $measPerDeg - 1 );
			// echo 'Lat : '.$curLat.'<br>';
			if( $curLat <= $_lat ){
				for ($j = 0; $j< $measPerDeg; $j++) {
					$curLon = $startx + $j / ( $measPerDeg - 1 );
					if( $curLon >= $_lon ){
						$short = substr ($data, $offset, 2);
						$shorts = reset(unpack("n*", $short));
						// echo $i.'/'.$j.'<br>';
						// printf("%10.8f; %10.8f; %d<br>", ($starty + 1 - $i / ($measPerDeg - 1)), ($startx + $j / ($measPerDeg - 1)), $shorts );
						echo 'Lat : '.$curLat.' / Lon : '.$curLon.' : '.$shorts.'<br>';
						return $shorts;
					}
					$offset += 2;
				}
			}else{
				$offset += ( 2 * $measPerDeg );
			}
			/*
			for ($j = 0; $j< 10; $j++) {
				$short = substr ($data, $offset, 2);
				$shorts = reset(unpack("n*", $short));
				// echo $i.'/'.$j.'<br>';
				printf("%10.8f; %10.8f; %d<br>", ($starty + 1 - $i / ($measPerDeg - 1)), ($startx + $j / ($measPerDeg - 1)), $shorts );

				$offset += 2;
			}
			echo '-----<br>';
			*/
		}
	} else echo "Could not read file!\n";
	fclose($fh);
	
	return 0;
}






// parseEle();

function parseEle(){

	$measPerDeg = 1201; // 3 second data
	// $measPerDeg = 3601; // 1 second data


	// $action = 'IMAGE';
	$action = 'TEXT';
	// $action = 'BDD';


	// $makeImg = false;
	// $makeImg = true;



	if( $action == 'IMAGE' ){
		$eleFactor = 0.1;
		
		$imgWidth = $measPerDeg;
		$imgHeight = $measPerDeg;
		
		$img = imagecreatetruecolor( $imgWidth, $imgHeight );

	}else if( $action == 'BDD' ){
		dbConnect();
		
		$imgWidth = $measPerDeg;
		$imgHeight = 100;
		
		$sql = 'INSERT INTO elevation (lat, lon, ele) VALUES ';
		
	}else if( $action == 'TEXT' ){
		$imgWidth = 100;
		$imgHeight = 10;
	}


	// $hgtfile = "../srtm/datas/N00E073.hgt";
	// $hgtfile = "../srtm/datas/N00E097.hgt";
	$hgtfile = "../srtm/datas/N43E003.hgt";

	$fh = fopen($hgtfile, 'rb') or die("Error opening $hgtfile. Aborting!");
	$hgtfile = basename($hgtfile);
	$starty = +substr ($hgtfile, 1, 2);
	if (substr ($hgtfile, 0, 1) == "S") {
			$starty = -$starty;
	}
	$startx = +substr ($hgtfile, 4, 3);
	if (substr ($hgtfile, 3, 1) == "W") {
			$startx = -$startx;
	}

	if ($data = fread($fh, 2 * $measPerDeg * $measPerDeg)) {
		$point = 0;
		$offset = 0;
		$hgtfile = basename( $hgtfile, '.hgt' );
		// echo $hgtfile."<br>";
		// echo("lat;lon;ele<br>");
		// for ($i = 0; $i < $measPerDeg; $i++) {
		// for ($j = 0; $j< $measPerDeg; $j++) {
		for ($i = 0; $i < $imgWidth; $i++) {
				for ($j = 0; $j< $imgHeight; $j++) {
						$short = substr ($data, $offset, 2);
						$shorts = reset(unpack("n*", $short));

						if( $action == 'IMAGE' ){
							$pixelEle = round( $shorts * $eleFactor );
							$color = imagecolorallocate( $img, $pixelEle, $pixelEle, $pixelEle );
							imagesetpixel($img, $j, $i, $color );
							
						}else if( $action == 'BDD' ){
							$sql .= '('.($starty + 1 - $i / ($measPerDeg - 1)).', '.($startx + $j / ($measPerDeg - 1)).', '.$shorts.'),';
							
						}else if( $action == 'TEXT' ){
							// echo $i.'/'.$j.'<br>';
							printf("%10.8f; %10.8f; %d<br>", ($starty + 1 - $i / ($measPerDeg - 1)), ($startx + $j / ($measPerDeg - 1)), $shorts );
						}

						$offset += 2;
						$point++;
				}
		}
	} else echo "Could not read file!\n";
	fclose($fh);

	if( $action == 'IMAGE' ){
		header("Content-type: image/png");
		// imagepng($img, $hgtfile);
		imagepng($img);
		imagedestroy($img);
		
	}else if( $action == 'BDD' ){
		$sql = substr( $sql, 0, -1 );
		// echo $sql;
		mysql_query( $sql );
		echo 'END INSERT';
	}
}

function dbConnect(){
	@mysql_connect( 'localhost', 'srtm', 'tVFADPTPPbcjP8Mq' );
	@mysql_selectdb( 'srtm' ) or 
	die('Cassé !' );
	mysql_query( 'SET NAMES utf8' );
}
?>