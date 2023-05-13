<?php
class Api_post_coastline extends Api_default {

    public $contentType = 'application/json';
    protected $dirCache = PATH_CACHE . 'coastline';
    // protected $dirCache = PATH_CACHE . 'coastbaked_test';

    public function __construct($_params) {
        set_time_limit(300);
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        $postDatas = $this->getPostJson();

        if (isset($postDatas['saveTile'])) {
            $this->writeDatas($postDatas);
        } else {
            $this->writeShape($postDatas);
        }


    }

    private function writeShape($_postDatas) {
        $res = [
            'success' => false,
        ];
        $filePath = PATH_DATAS . 'coastlines/land-polygons-complete-4326/shapes/' . $_postDatas['shapeId'] . '.json';
        file_put_contents($filePath, json_encode($_postDatas['coords']));
        $res['shapeId'] = $_postDatas['shapeId'];
        $res['success'] = true;
        echo json_encode($res);
    }

    private function writeDatas($_postDatas) {
        $message = '';
        $filePath = $this->dirCache . '/' . $this->buildFilePath($_postDatas);
        $currentShapes = $this->getCurrentShapes($filePath);
        if ($_postDatas['status'] == 'SEA') {
            $message = 'ONLY SEA, do nothing';
        } else {
            if ($_postDatas['status'] == 'LAND') {
                if (isset($currentShapes[0]) && $currentShapes[0] == 'LAND') {
                    $message = 'ONLY LAND but ' . $filePath . ' already contain coast datas';
                }
                $currentShapes = ['LAND'];
            } else {
                // $currentShapes[] = $_postDatas['shapes'];
                foreach ($_postDatas['shapes'] as $shape) {
                    $currentShapes[] = $shape;
                }
            }
            $this->makeFolders([$_postDatas['z'], $_postDatas['x'], $_postDatas['y']]);
            file_put_contents($filePath, json_encode($currentShapes));
        }
        echo json_encode([
            'success' => true, 
            'message' => $message, 
            'path' => $filePath, 
        ]);
    }

    private function getCurrentShapes($_path) {
        if (is_file($_path)) {
            return json_decode(file_get_contents($_path));
        }
        return [];
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