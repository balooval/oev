<?php
require_once(dirname(__FILE__) . '/php-shapefile/ShapeFileAutoloader.php');
require_once(dirname(__FILE__) . '/php-shapefile/ShapeFile.php');

//\ShapeFile\ShapeFileAutoloader::register();

// ini_set('memory_limit','500M');
// readCoastline();

function readCoastline() {
	$showImage = false;
	$showImage = true;
	
	$imgFile = 'coastline1.png';
	
	$shapePath = dirname( __FILE__ ).'/../../coastline/simplified-land-polygons-complete/';

	$ShapeFile = new ShapeFile($shapePath . 'simplified_land_polygons.shp');
	if (!$showImage) {
		echo 'getShapeType:<br />';
		var_dump($ShapeFile->getShapeType()." - ".$ShapeFile->getShapeType(ShapeFile::FORMAT_STR));
		echo '<br /><br />';
		echo 'getTotRecords:<br />';
		var_dump($ShapeFile->getTotRecords());
		echo '<br /><br />';
		echo 'Bounding Box :<br />';
		print_r($ShapeFile->getBoundingBox());
		echo '<br /><br />';
		echo 'getDBFFields :<br />';
		print_r($ShapeFile->getDBFFields());
		echo '<br /><br />';
	}

	
	$projW = 20037508 * 2;
	$projH = 20037508 * 2;
	
	$imgW = 2048;
	$imgH = 2048;
	
	$imgProjRatio = $imgW / $projW;
	// echo '$imgProjRatio : ' . $imgProjRatio . '<br />';
	
	if (!is_file($imgFile)) {
		$image = imagecreatetruecolor($imgW, $imgH);
	} else {
		$image = imagecreatefrompng($imgFile);
	}
	$red = imagecolorallocate($image, 255, 0, 0);
	
	// Read all the records
	// $limite = 50000;
	$limite = 10000;
	$curNb = 0;
	// max records : 62631;
	$curRecord = 60000;
	$ShapeFile->setCurrentRecord($curRecord);
	
	while ($record = $ShapeFile->getRecord(ShapeFile::GEOMETRY_BOTH)) {
		set_time_limit(120);
		if ($record['dbf']['_deleted']) continue;
		// Geometry
		
		// print_r($record['shp']);
		if ($record['shp']['numparts'] > 1) {
			break;			
		}
		$startX = null;
		$startY = null;
		
		$polygone = array();
		foreach ($record['shp']['parts'][0]['rings'][0]['points'] as $id => $pt) {
			$ptX = $pt['x'] * $imgProjRatio + $imgW / 2;
			$ptY = $pt['y'] * $imgProjRatio + $imgW / 2;
			
			$polygone[] = round($ptX);
			$polygone[] = round($ptY);
			/*
			if ($startX !== null) {
				imageline ($image, $startX, $startY, $ptX, $ptY, $red);
			}
			// imagesetpixel($image , $ptX, $ptY, $red);

			
			// imageline ($image, $startX, $startY, $ptX, $ptY, $red);
			// echo $id . ' ' . $startX . ' ' . $startY . ' ' . $ptX . ' ' . $ptY . '<br />';

			$startX = $ptX;
			$startY = $ptY;
			*/
		}
		// var_dump($polygone);
		// var_dump(count($polygone));
		imagefilledpolygon($image, $polygone, count($polygone) / 2, $red);
		
		/*
		$minX = $record['shp']['bounding_box']['xmin'];
		$maxX = $record['shp']['bounding_box']['xmax'];
		$minY = $record['shp']['bounding_box']['ymin'];
		$maxY = $record['shp']['bounding_box']['ymax'];
		
		$pxlX_A = x2lon($minX) + $imgW / 2;
		$pxlX_B = x2lon($maxX) + $imgW / 2;
		$pxlY_A = x2lon($minY) + $imgH / 2;
		$pxlY_B = x2lon($maxY) + $imgH / 2;
		// echo $pxlX_A . ' ' . $pxlX_B . ' ' . $pxlY_A . ' ' . $pxlY_B . '<br />';
		
		imagefilledrectangle($image, $pxlX_A, $pxlY_A, $pxlX_B, $pxlY_B, $red);
		*/
		
		$curNb ++;
		if ($curNb >= $limite) {
			break;
		}
	}
	
	if ($showImage) {
		header('Content-Type: image/png');
		imagepng($image, dirname(__FILE__).'/' . $imgFile, 9);
		imagepng($image);
		// imagedestroy($image);
	}
}

function x2lon($x) {
	return rad2deg($x / 6378137.0);
}
function y2lat($y) {
	return rad2deg(2.0 * atan(exp($y / 6378137.0)) - M_PI_2);
}
?>

