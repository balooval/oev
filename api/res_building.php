<?php
class Api_building extends Api_default {

    public $contentType = 'application/json';
    protected $dirCache = PATH_CACHE . 'building';
    private $params;
    private $serversOverpass = [
        'https://overpass.kumi.systems/api/interpreter', 
        'https://overpass-api.de/api/interpreter'
    ];

    public function __construct($_params) {
        $this->params = $_params;
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if (!is_file($filePath)) $this->fetchDatas($this->params, $filePath);
        // $this->fetchDatas($this->params, $filePath);
        return file_get_contents($filePath);
    }

    private function buildFilePath($_param) {
        return implode('/', [
            $_param['z'], 
            $_param['x'], 
            $_param['y'], 
            'building.json', 
        ]);
    }

    private function fetchDatas($_param, $_filePath) {
        $x = $_param['x'];
        $y = $_param['y'];
        $z = $_param['z'];
        $startC = $this->tileToCoords($x, $y, $z);
		$endC = $this->tileToCoords($x + 1, $y + 1, $z);
		$south = $endC[1];
		$north = $startC[1];
		$east = $startC[0];
		$west = $endC[0];
		$coord = '('.$south.','.$east.','.$north.','.$west.')';
		$curServer = $this->getOverpassUrl();
		// $url = $curServer . '/interpreter?data=[out:json];(way' . $coord . '["building"~"."];way' . $coord . '["building:part"~"."]);(._;>;);out;';
		$url = $curServer . '/interpreter?data=[out:json];way' . $coord . '["building"~"."];(._;>;);out;';
        // echo $url;
        // exit();
        $response = @file_get_contents($url);
        // $obj = json_decode($response, true);
        // $obj['url'] = $url;
        // $response = json_encode($obj, JSON_PRETTY_PRINT);
        // echo $response;
        // exit();
		file_put_contents($_filePath, $response);
    }

    private function getOverpassUrl() {
        $index = round(rand(0, count($this->serversOverpass) - 1));
        return $this->serversOverpass[$index];
    }

    private function tileToCoords($_tileX, $_tileY, $_zoom) {
        $p = [0, 0];
        $n = pi() - ((2.0 * pi() * $_tileY) / pow(2.0, $_zoom));
        $p[0] = (($_tileX / pow(2.0, $_zoom) * 360.0) - 180.0);
        $p[1] = (180.0 / pi() * atan(sinh($n)));
        return $p;
    }

}
?>