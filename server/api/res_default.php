<?php
abstract class Api_default {

    protected $useCache = true;

    public function __construct($_params) {
        if (isset($_params['cache']) && $_params['cache'] == 0) {
            $this->useCache = false;
        }
    }

    abstract public function process();

    protected function makeFolders($_folders) {
        $curPath = $this->dirCache;
        foreach ($_folders as $folder) {
            $curPath .= '/' . $folder;
            if (!is_dir($curPath)) {
                @mkdir($curPath);
            }
        }
    }

    protected function coordToTile($_lon, $_lat, $_zoom) {
        $xTile = floor((($_lon + 180) / 360) * pow(2, $_zoom));
        $yTile = floor((1 - log(tan(deg2rad($_lat)) + 1 / cos(deg2rad($_lat))) / pi()) /2 * pow(2, $_zoom));
        return [
            'x' => $xTile, 
            'y' => $yTile, 
        ];
    }

    protected function getPostJson() {
        $content = trim(file_get_contents("php://input"));
        return json_decode($content, true);
    }
}
?>