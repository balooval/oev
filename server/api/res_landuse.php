<?php
class Api_landuse extends Api_default {

    public $contentType = 'application/json';
    protected $dirCache = PATH_CACHE . 'landuse';
    private $params;
    private $serversOverpass = [
        'https://overpass.kumi.systems/api/interpreter', 
        'https://overpass-api.de/api/interpreter'
    ];

    private $_tags = [
        '"landuse"', 
        '"natural"', 
        '"waterway"', 
        // '"landuse"="vineyard"', 
        // '"landuse"="forest"', 
        // '"landuse"="residential"', 
        // '"natural"="wood"', 
        // '"natural"="scrub"', 
    ];

    public function __construct($_params) {
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if ($this->mustFetchData($filePath)) $this->fetchDatas($this->params, $filePath);
        return $this->loadCachedFile($filePath);
    }

    private function mustFetchData($_filePath) {
        if (!$this->useCache) return true;
        if (!is_file($_filePath)) return true;
        $fileDate = filemtime($_filePath);
        if ($fileDate < 1557187200) return true;
        return false;
    }

    private function loadCachedFile($_filePath) {
        $content = file_get_contents($_filePath);
        if ($content) return $content;
        unlink($_filePath);
        return '{
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

    private function buildFilePath($_param) {
        return implode('/', [
            $_param['z'], 
            $_param['x'], 
            $_param['y'], 
            'landuse.json', 
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
		$bbox = $south . ',' . $east . ',' . $north . ',' . $west;
		$curServer = $this->getOverpassUrl();
        $url = $curServer . '/interpreter?data=[out:json];';
        $query = '(';
        foreach ($this->_tags as $tag) {
            $query .= 'way[' . $tag . '](' . $bbox . ');';
            $query .= 'rel[' . $tag . '](' . $bbox . ');';
        }
        $query .= ');(._;>;);out;';
        $url .= $query;
        // echo $url;
        // exit();
        $response = @file_get_contents($url);
        // $obj = json_decode($response, true);
        // $obj['url'] = $url;
        // $response = json_encode($obj, JSON_PRETTY_PRINT);
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