<?php
class Api_osm extends Api_default {

    public $contentType = 'image/png';
    protected $dirCache = PATH_CACHE . 'tiles_osm';
    private $remoteServer = 'http://c.tile.openstreetmap.org';
    private $params;

    public function __construct($_params) {
        $this->params = $_params;
    }
    
    public function process() {
        $filePath = $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x']]);
        if (!is_file($filePath)) $this->loadImage($filePath);
        return file_get_contents($this->localFilePath($filePath));
    }

    private function loadImage($_filePath) {
        $url = $this->remoteServer . '/' . $_filePath;
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
}
?>