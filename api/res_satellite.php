<?php
class Api_satellite extends Api_default {

    public $contentType = 'image/png';
    protected $dirCache = PATH_CACHE . 'satellite';
    private $params;

    public function __construct($_params) {
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        $filePath = $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x']]);
        if ($this->mustFetchDatas($this->localFilePath($filePath))) $this->loadImage($this->params, $filePath);
        return file_get_contents($this->localFilePath($filePath));
    }

    private function mustFetchDatas($_filePath) {
        if (!$this->useCache) return true;
        if (!is_file($_filePath)) return true;
        return false;
    }

    private function loadImage($_params, $_filePath) {
        // if ($_params['z'] < 14) {
        //     $image = file_get_contents(PATH_CACHE . 'tiles_osm' . $this->buildFilePath($_params));
        // } else {
            $url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' . $_params['z'] . '/' . $_params['y'] . '/' . $_params['x'];
            $image = file_get_contents($url);
        // }
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