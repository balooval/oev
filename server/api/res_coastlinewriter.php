<?php
require '../vendor/autoload.php';

Shapefile\ShapefileAutoloader::register();

use Shapefile\Shapefile;
use Shapefile\ShapefileException;
use Shapefile\ShapefileReader;

class Api_coastlinewriter extends Api_default {

    public $contentType = 'text/html';
    // public $contentType = 'application/json';
    protected $dirCache = PATH_CACHE . 'coastbaked';
    private $Shapefile;

    public function __construct($_params) {
        set_time_limit(300);
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        $startTime = time();
        $this->extractDatas();
        $memory = memory_get_usage(false) / 1000000;
        echo '<br><br>Memory : ' . $memory . '<br>';
        $memory = memory_get_peak_usage (true) / 1000000;
        echo 'Memory MAX : ' . $memory . '<br>';
        $elapsedTime = time() - $startTime;
        echo 'Elapsed seconeds : ' . $elapsedTime . '<br>';
    }

    private function extractDatas() {
        try {
            // $shpFile = PATH_DATAS . 'coastlinesSimplified/simplified-land-polygons-complete-3857/simplified_land_polygons.shp';
            $shpFile = PATH_DATAS . 'coastlines/land-polygons-split-4326/land_polygons.shp';
            $this->Shapefile = new ShapefileReader($shpFile);
            // $bigsShapes = json_decode(file_get_contents($this->dirCache . '/bigs.json'), true);
            // $bigsShapes = array_values($bigsShapes);
            $shapeMin = file_get_contents($this->dirCache . '/lastIndex.txt');
            $shapeCount = 5000;
            for ($i = $shapeMin; $i < $shapeMin + $shapeCount; $i ++) {
                // if (in_array($i, $bigsShapes)) {
                //     echo '<br><br>Big shape (' . $i . '), pass<br><br>';
                //     continue;
                // }
                $this->extractShapeJsonToCoords($i);
            }
            file_put_contents($this->dirCache . '/lastIndex.txt', $i);
        } catch (ShapefileException $e) {
            echo "Error Type: " . $e->getErrorType()
                . "\nMessage: " . $e->getMessage()
                . "\nDetails: " . $e->getDetails();
            return false;
        }
    }

    private function extractShapeJsonToCoords($_shapeId) {
        echo $_shapeId . ', ';
        $this->Shapefile->setCurrentRecord($_shapeId);
        $Geometry = $this->Shapefile->fetchRecord();
        $geoJson = $Geometry->getGeoJSON();
        file_put_contents($this->dirCache . '/shapes/' . $_shapeId . '-coords.json', $geoJson);
        // $geoJson = $this->convertGeoJsonToCoords($geoJson);
        // file_put_contents($this->dirCache . '/shapes/' . $_shapeId . '-coords.json', json_encode($geoJson));
        $geoJson = null;
    }

    private function convertGeoJsonToCoords($_geoJson) {
        $geoJson = json_decode($_geoJson, true);
        $geoJson['bbox'] = [
            'minLon' => $this->x2lon($geoJson['bbox'][0]), 
            'maxLon' => $this->x2lon($geoJson['bbox'][2]), 
            'minLat' => $this->y2lat($geoJson['bbox'][1]), 
            'maxLat' => $this->y2lat($geoJson['bbox'][3]), 
        ];
        $convertedCoords = [];
        foreach ($geoJson['coordinates'][0] as $coord) {
            $convertedCoords[] = $this->_mercatorToCoord($coord);
        }
        $geoJson['coordinates'] = $convertedCoords;
        $convertedCoords = null;
        return $geoJson;
    }

    private function _mercatorToCoord($_mercatorPoint) {
        return [
            $this->x2lon($_mercatorPoint[0]), 
            $this->y2lat($_mercatorPoint[1]), 
        ];
    }

    private function getTilesOverlap($_bbox, $_zoom) {
        $tiles = [];
        $upperLeft = $this->coordToTile($_bbox['lonMin'], $_bbox['latMin'], $_zoom);
        $bottomRight = $this->coordToTile($_bbox['lonMax'], $_bbox['latMax'], $_zoom);
        echo 'X from ' . $upperLeft['x'] . ' TO ' . $bottomRight['x'] . '<br>';
        echo 'Y from ' . $bottomRight['y'] . ' TO ' . $upperLeft['y'] . '<br>';
        for ($lon = $upperLeft['x']; $lon <= $bottomRight['x']; $lon ++) {
            for ($lat = $bottomRight['y']; $lat <= $upperLeft['y']; $lat ++) {
                $path = $_zoom . '/' . $lon . '/' . $lat . '<br>';
                $tiles[$path] = [
                    'z' => $_zoom, 
                    'x' => $lon, 
                    'y' => $lat, 
                ];
            }
        }
        return $tiles;
    }

    private function lon2x($lon) {
        return deg2rad($lon) * 6378137.0;
    }

    private function lat2y($lat) {
        return log(tan(M_PI_4 + deg2rad($lat) / 2.0)) * 6378137.0;
    }

    private function x2lon($x) {
        return rad2deg($x / 6378137.0);
    }

    private function y2lat($y) {
        return rad2deg(2.0 * atan(exp($y / 6378137.0)) - M_PI_2);
    }

    private function buildFilePath($_param) {
        return implode('/', [
            $_param['z'], 
            $_param['x'], 
            $_param['y'], 
            'shapes.json', 
        ]);
    }

}
?>