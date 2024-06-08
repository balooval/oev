<?php
require_once(dirname(__FILE__) . '/res_elevation.php');

class Api_ign extends Api_default {

    public $contentType = 'image/png';
    // public $contentType = 'text';
    // public $contentType = 'text/html';
    protected $dirCache = PATH_CACHE . 'ign_alti';
    private $dirRaw = PATH_DATAS . 'rge_alt_zip';
    private $params;

    private $fileCache;
    private $outOfBound;
    private $srtmElevation;
    private ZipArchive $zip;

    public function __construct($params) {
        // $this->useCache = false;
        $this->params = $params;
        if (isset($_params['output']) && $_params['output'] == 'text') {
            $this->contentType = 'text/html';
        }
        parent::__construct($params);

        $this->fileCache = [];
        $this->outOfBound = false;

        $this->srtmElevation = new Api_elevation($params);

        ini_set('memory_limit', '1024M');

        $this->zip = new ZipArchive;
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);

        if ($this->mustFetchDatas($filePath)) {
            $filePath = $this->buildElevationImage($filePath);
        }

        return file_get_contents($filePath);
    }

    private function mustFetchDatas($_filePath) {
        if (!$this->useCache) {
            return true;
        }

        if (!is_file($_filePath)) {
            return true;
        }

        return false;
    }

    private function buildFilePath($_param) {
        return implode('/', [
            $_param['z'], 
            $_param['x'], 
            $_param['y'], 
            ($_param['def'] + 1) . '.png', 
        ]);
    }

    private function buildElevationImage($_filePath) {
        $x = $this->params['x'];
        $y = $this->params['y'];
        $z = $this->params['z'];
        $def = $this->params['def'];
        $startC = $this->tileToCoords($x, $y, $z);
        $endC = $this->tileToCoords($x + 1, $y + 1, $z);

        $south = $endC[1];
        $north = $startC[1];
        $west = $startC[0];
        $east = $endC[0];

        $stepLat = ($north - $south) / $def;
        $stepLon = ($east - $west) / $def;

        $imageSize = $def + 1;
        $imageObject = imagecreatetruecolor($imageSize, $imageSize);
        $pixX = 0;
        $elevation = 0;
        
        for ($curLon = $west; $curLon <= $east; $curLon += $stepLon) {
            
            $pixY = 0;
            for ($i = 0; $i <= $def; $i ++) {
                $curLat = ($south + ($i * $stepLat));
                $tmpElevation = $this->extractElevation($curLon, $curLat);

                if ($tmpElevation >= 0) {
                    $elevation = $tmpElevation;
                }

                $elevationMeter = floor($elevation);
                
                $red = floor($elevationMeter / 256);
                $blue = $elevationMeter - ($red * 256);
                $green = $elevation - floor($elevation);
                $green = round($green * 100);
                
                $pixColor = imagecolorallocate($imageObject, $red, $green, $blue);
                imagesetpixel($imageObject, $pixX, ($imageSize - 1) - $pixY, $pixColor);
                
                $pixY ++;
            }

            $pixX ++;
        }

        if ($this->outOfBound === true) {
            $_filePath = $this->srtmElevation->dirCache . '/' . $this->buildFilePath($this->params);
            $this->srtmElevation->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        }
        imagepng($imageObject, $_filePath, 9);
        imagedestroy($imageObject);

        return $_filePath;
    }

    private function extractElevation($lon, $lat) {
        set_time_limit(30);

        $lambertCoord = $this->coordToLambert($lon, $lat);
        $lambertX = round($lambertCoord['x']);
        $lambertY = round($lambertCoord['y']);

        $kmX = $lambertX / 1000;
        $meterX = $kmX - floor($kmX);
        $indexX = round($meterX * 1000);
        
        $kmY = $lambertY / 1000;
        $meterY = $kmY - floor($kmY);
        $indexY = 1000 - round($meterY * 1000);

        if ($indexY == 1000) {
            $indexY = 0;
            $lambertY -= 1;
        }

        $fileIndex = $this->getEleFileIndex($lambertX, $lambertY);
        $cacheKey = $fileIndex['x'] . '_' . $fileIndex['y'];
        
        $ele = 0;
        
        if (array_key_exists($cacheKey, $this->fileCache) === false) {
            $fileName = $this->getEleFileFromCoord(
                $lambertX,
                $lambertY,
                $lambertCoord['projection'],
                $lambertCoord['eleRef'],
                $lambertCoord['zone'],
            );
            
            if ($fileName === null) {
                // Fallback to SRTM
                return $this->srtmElevation->extractElevation($lat, $lon);
            }

            $this->fileCache[$cacheKey] = [];

            $this->zip->open($fileName . '.zip');
            $fileContent = $this->zip->getFromName(basename($fileName) . '.asc');
            $test = $this->zip->getNameIndex(0);
            $this->zip->close();

            // $fileContent = file_get_contents($fileName);
            $fileLines = explode(PHP_EOL, $fileContent);

            $headerSize = 6;
            $lineCount = count($fileLines);

            for ($i = $headerSize; $i < $lineCount; $i ++) {
                $values = explode(' ', trim($fileLines[$i]));
                $this->fileCache[$cacheKey][$i - 6] = $values;
            }
        }

        $ele = $this->fileCache[$cacheKey][$indexY][$indexX];
        // $ele = round($ele); // TODO : gérer les centimetres dans l'image retournée

        return $ele;
    }

    protected function getEleFileFromCoord($x, $y, $projection, $eleRef, $zone) {
        $fileIndex = $this->getEleFileIndex($x, $y);
        
        $fileName = $this->dirRaw . '/' . 'RGEALTI_' . $zone . '_' . $fileIndex['x'] . '_' . $fileIndex['y'] . '_MNT_' . $projection . '_' . $eleRef;
        // echo $fileName;
        // exit();

        if (!is_file($fileName . '.zip')) {
            $this->outOfBound = true;
            return null;
        }

        return $fileName;
    }

    protected function getEleFileIndex($x, $y) {
        $x = floor($x / 1000);
        $x = str_pad($x, 4, '0', STR_PAD_LEFT);

        $y = floor($y / 1000);
        $y += 1;
        $y = str_pad($y, 4, '0', STR_PAD_LEFT);

        return [
            'x' => $x,
            'y' => $y,
        ];
    }

}

?>