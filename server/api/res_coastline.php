<?php
require '../vendor/autoload.php';

Shapefile\ShapefileAutoloader::register();

use Shapefile\Shapefile;
use Shapefile\ShapefileException;
use Shapefile\ShapefileReader;

class Api_coastline extends Api_default {

    // public $contentType = 'text/html';
    public $contentType = 'application/json';
    // protected $dirCache = PATH_CACHE . 'coastbaked';
    protected $dirCache = PATH_CACHE . 'coastline';

    public function __construct($_params) {
        set_time_limit(600);
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        if (isset($this->params['shapeId'])) {
            $this->getJsonShape($this->params['shapeId']);
        } else {
            $this->readDatas();
        }
        // $this->getBigPolygons();
        // $this->extractDatas();
        // $this->extractShapeJsonToCoords(62625);
    }

    private function readDatas() {

        $tileDatas = $this->getTileDatas($this->params);
        if (!$tileDatas) {
            echo json_encode([]);
            return;
        }
        echo $tileDatas;
    }


    private function getJsonShape($_shapeId) {
        $filePath = PATH_DATAS . 'coastlines/land-polygons-complete-4326/shapes/' . $_shapeId . '.json';
        if (!is_file($filePath)) {
            $res = ['error' => 'NO_FILE'];
            echo json_encode($res);
        }
        echo file_get_contents($filePath);
    }


    private function getTileDatas($_param) {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($_param);
        if (!is_file($filePath)) {
            return $this->searchParentData($_param);
        }
        return file_get_contents($filePath);
    }

    private function searchParentData($_tile) {
        if ($_tile['z'] < 2) return null;
        $parentTile = $this->getParentTile($_tile);
        return $this->getTileDatas($parentTile);
    }

    private function getParentTile($_tile) {
        return [
            'x' => floor($_tile['x'] / 2), 
            'y' => floor($_tile['y'] / 2), 
            'z' => $_tile['z'] - 1
        ];
    }

    private function extractShapeJsonToCoords($_shapeId) {
        echo 'Start<br>';
        $Shapefile = new ShapefileReader(PATH_DATAS . '/coastlinesSimplified/simplified-land-polygons-complete-3857/simplified_land_polygons.shp');
        $Shapefile->setCurrentRecord($_shapeId);
        $Geometry = $Shapefile->fetchRecord();
        $geoJson = $Geometry->getGeoJSON();
        $geoJson = $this->convertGeoJsonToCoords($geoJson);
        file_put_contents($this->dirCache . '/' . $_shapeId . '-coords.json', json_encode($geoJson));
        echo 'END<br>';
    }

    private function getBigPolygons() {
        try {
            $res = [
                'lastIndex' => 0,
                'success' => false,
            ];
            $shpFile = PATH_DATAS . '/coastlines/land-polygons-complete-4326/land_polygons.shp';
            $pointsCountsPath = PATH_DATAS . '/coastlines/land-polygons-complete-4326/bigs.json';
            $lastIndexPath = PATH_DATAS . '/coastlines/land-polygons-complete-4326/lastIndex.txt';
            $shapeMin = file_get_contents($lastIndexPath);
            // $shapeMin = 58986;
            $shapeCur = $shapeMin;
            $shapeCount = 10;

            $pointsCounts = json_decode(file_get_contents($pointsCountsPath), true);
            // $pointsCounts = [];

            $Shapefile = new ShapefileReader($shpFile);
            $Shapefile->setCurrentRecord($shapeMin);
            while ($Geometry = $Shapefile->fetchRecord()) {
                if ($Geometry->isDeleted()) {
                    continue;
                }
                $array = $Geometry->getArray();
                $nbPoints = count($array['rings'][0]['points']);
                $pointsCounts['shape_' . $shapeCur] = $nbPoints;
                unset($array);
                $res['lastIndex'] = $shapeCur;
                $shapeCur ++;
                if ($shapeCur >= ($shapeMin + $shapeCount)) {
                    break;
                }
            }
            file_put_contents($lastIndexPath, $shapeCur);

        } catch (ShapefileException $e) {
            // Print detailed error information
            echo "Error Type: " . $e->getErrorType()
                . "\nMessage: " . $e->getMessage()
                . "\nDetails: " . $e->getDetails();
            return false;
        }
        arsort($pointsCounts);
        $pointsCounts = array_slice($pointsCounts, 0, 100);
        $res['pointsCounts'] = $pointsCounts;
        file_put_contents($pointsCountsPath, json_encode($pointsCounts));
        $res['success'] = true;
        echo json_encode($res);
        return false;
    }

    private function extractDatas() {
        try {
            $zoom = 14;
            $shapeMin = file_get_contents($this->dirCache . '/lastIndex.txt');
            // $shapeMin = 1;
            $shapeCur = $shapeMin;
            $shapeCount = 200;

            // $pointsCounts = [];
            $pointsCounts = json_decode(file_get_contents($this->dirCache . '/bigs.json'), true);

            $Shapefile = new ShapefileReader(PATH_DATAS . '/coastlines/land-polygons-complete-4326/land_polygons.shp');
            // $Shapefile = new ShapefileReader(PATH_DATAS . '/coastlinesSimplified/simplified-land-polygons-complete-3857/simplified_land_polygons.shp');
            $Shapefile->setCurrentRecord($shapeMin);
            while ($Geometry = $Shapefile->fetchRecord()) {
                if ($Geometry->isDeleted()) {
                    continue;
                }
                echo 'Processing shape ' . $shapeCur . ' ';
                
                $array = $Geometry->getArray();
                $nbPoints = count($array['rings'][0]['points']);
                echo ' : ' . $nbPoints . 'points / ';
                // echo $shapeCur . ' : ' . $nbPoints . ' points<br>';
                
                $pointsCounts['shape_' . $shapeCur] = $nbPoints;
                
                // echo '<br>';
                /*
                $bbox = $Geometry->getBoundingBox();
                $coordsBBox = [
                    'lonMin' => $this->x2lon($bbox['xmin']), 
                    'lonMax' => $this->x2lon($bbox['xmax']), 
                    'latMin' => $this->y2lat($bbox['ymin']), 
                    'latMax' => $this->y2lat($bbox['ymax']), 
                ];
                $overlapTiles = $this->getTilesOverlap($coordsBBox, $zoom);
                echo '$overlapTiles ' . count($overlapTiles) . '<br>';
                // print_r($overlapTiles);
                // echo '<br>';
                foreach ($overlapTiles as $tile) {
                    $this->makeFolders([$tile['z'], $tile['x'], $tile['y']]);
                    $tileFile = $this->dirCache . '/' . $tile['z'] . '/' . $tile['x'] . '/' . $tile['y'] . '/shapes.txt';
                    file_put_contents($tileFile, $shapeCur . PHP_EOL,  FILE_APPEND);
                }
                $geoJson = $Geometry->getGeoJSON();
                $geoJson = $this->convertGeoJsonToCoords($geoJson);
                file_put_contents($this->dirCache . '/' . $shapeCur . '.json', json_encode($geoJson));
                */
                $shapeCur ++;
                if ($shapeCur >= ($shapeMin + $shapeCount)) {
                    break;
                }
            }
            file_put_contents($this->dirCache . '/lastIndex.txt', $shapeCur);

        } catch (ShapefileException $e) {
            // Print detailed error information
            echo "Error Type: " . $e->getErrorType()
                . "\nMessage: " . $e->getMessage()
                . "\nDetails: " . $e->getDetails();
            return false;
        }
        echo '<br>';
        echo '<br>';
        arsort($pointsCounts);
        // print_r($pointsCounts);
        $pointsCounts = array_slice($pointsCounts, 0, 20);
        print_r($pointsCounts);
        file_put_contents($this->dirCache . '/bigs.json', json_encode($pointsCounts));
        return false;
    }

    private function convertGeoJsonToCoords($_geoJson) {
        // '{"type":"Polygon","bbox":[-527482.6203858228,7464424.244210574,-526864.1292949753,7465038.441399676],"coordinates":[[[-526864.1292949753,7464424.244210574],[-526979.011009474,7465000.679550971],[-527482.6203858228,7465038.441399676],[-527244.1740365437,7464540.668494733],[-526864.1292949753,7464424.244210574]]]}'
        $geoJson = json_decode($_geoJson, true);
        $geoJson['bbox'] = [
            'minLon' => $this->x2lon($geoJson['bbox'][0]), 
            'maxLon' => $this->x2lon($geoJson['bbox'][2]), 
            'minLat' => $this->y2lat($geoJson['bbox'][1]), 
            'maxLat' => $this->y2lat($geoJson['bbox'][3]), 
        ];
        $geoJson['coordinates'] = array_map([$this, '_mercatorToCoord'], $geoJson['coordinates'][0]);
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