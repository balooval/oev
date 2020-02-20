<?php
class Api_osm extends Api_default {

    public $contentType = 'image/png';
    protected $dirCache = PATH_CACHE . 'tiles_osm_fr';
    private $serversList = [
        // 'http://a.tile.openstreetmap.org', 
        // 'http://b.tile.openstreetmap.org', 
        // 'http://c.tile.openstreetmap.org', 
        'http://a.tile.openstreetmap.fr/osmfr/', 
        'http://b.tile.openstreetmap.fr/osmfr/', 
        'http://c.tile.openstreetmap.fr/osmfr/', 
    ];
    private $params;

    public function __construct($_params) {
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        $filePath = $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x']]);
        if ($this->mustFetchDatas($this->localFilePath($filePath))) $this->loadImage($filePath);
        return file_get_contents($this->localFilePath($filePath));
    }

    private function mustFetchDatas($_filePath) {
        if (!$this->useCache) return true;
        if (!is_file($_filePath)) return true;
        return false;
    }

    private function loadImage($_filePath) {
        $url = $this->server() . '/' . $_filePath;
        $image = file_get_contents($url);
        file_put_contents($this->localFilePath($_filePath), $image);
    }

    private function buildFilePath($_param) {
        return implode('/', [
            $_param['z'], 
            $_param['x'], 
            $_param['y'] . '.png', 
        ]);
    }

    private function localFilePath($_filePath) {
        return $this->dirCache . '/' . $_filePath;
    }

    private function server() {
        $index = round(rand(0, count($this->serversList) - 1));
        return $this->serversList[$index];
    }
}
?>