<?php
class Api_ign extends Api_default {

    public $contentType = 'image/png';
    // public $contentType = 'text';
    // public $contentType = 'text/html';
    protected $dirCache = PATH_CACHE . 'ign_alti';
    private $dirRaw = PATH_DATAS . 'rge_alti';
    private $params;

    private $fileCache;
    private $readTotalTime;

    public function __construct($params) {
        // $this->useCache = false;
        $this->params = $params;
        parent::__construct($params);

        $this->fileCache = [];
        $this->readTotalTime = 0;

        ini_set('memory_limit', '512M');
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if ($this->mustFetchDatas($filePath)) {
            $this->buildElevationImage($filePath);
        }
        // echo '$this->readTotalTime: ' . $this->readTotalTime . '<br>';
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
                
                // if ($tmpElevation == 0) {
                    // echo '$tmpElevation : ' . $tmpElevation . '<br>';
                // }
                
                // echo 'X : ' . $pixX . ', Y : ' . ($imageSize - 1) - $pixY . ', $tmpElevation : ' . $tmpElevation . '<br>';

                if ($tmpElevation >= 0) {
                    $elevation = $tmpElevation;
                }
                
                $red = floor($elevation / 256);
                $blue = $elevation - ($red * 256);
                $green = 0;
                
                $pixColor = imagecolorallocate($imageObject, $red, $green, $blue);
                imagesetpixel($imageObject, $pixX, ($imageSize - 1) - $pixY, $pixColor);
                
                $pixY ++;
            }

            $pixX ++;
        }

        imagepng($imageObject, $_filePath, 9);
        imagedestroy($imageObject);
    }

    private function extractElevation($lon, $lat) {
        set_time_limit(30);

        $lambertCoord = $this->coordToLambert($lon, $lat);
        $lambertX = round($lambertCoord[0]);
        $lambertY = round($lambertCoord[1]);

        // echo '$lambertX : ' . $lambertX . ', $lambertY : ' . $lambertY . '<br>';

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
            // $avant = microtime(true);
            // $this->fileCache = [];
            $this->fileCache[$cacheKey] = [];
            
            $fileName = $this->getEleFileFromCoord($lambertX, $lambertY);

            /*
            $fh = fopen($fileName, 'r') or die("Error opening $fileName. Aborting!");
            
            for ($i = 0; $i < 6; $i ++) {
                $line = fgets($fh);
            }


            $curY = 0;
            
            while (($line = fgets($fh)) !== false) {
                $values = explode(' ', trim($line));
                $this->fileCache[$cacheKey][$curY] = $values;
                $curY ++;
            }


            fclose($fh);
            */

            $fileContent = file_get_contents($fileName);
            $fileLines = explode(PHP_EOL, $fileContent);

            $headerSize = 6;
            $lineCount = count($fileLines);

            // echo 'Read file ' . $cacheKey . '<br>';

            for ($i = $headerSize; $i < $lineCount; $i ++) {
                $values = explode(' ', trim($fileLines[$i]));
                $this->fileCache[$cacheKey][$i - 6] = $values;
            }

            // $after = microtime(true);

            // var_dump($after - $avant); // en micro secondes
            // $this->readTotalTime += $after - $avant;
        }

        $ele = $this->fileCache[$cacheKey][$indexY][$indexX];
        $ele = round($ele); // TODO : gérer les centimetres dans l'image retournée

        return $ele;
    }

    protected function getEleFileFromCoord($x, $y) {
        $fileIndex = $this->getEleFileIndex($x, $y);
        
        $fileName = $this->dirRaw . '/' . 'RGEALTI_FXX_' . $fileIndex['x'] . '_' . $fileIndex['y'] . '_MNT_LAMB93_IGN69.asc';

        if (!is_file($fileName)) {
            // echo 'file ' . $fileName . ' not exist' . PHP_EOL;
            exit;
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

    private function tileToCoords($_tile_x, $_tile_y, $_zoom) {
        $p = [0, 0];
        $n = pi() - ((2.0 * pi() * $_tile_y) / pow(2.0, $_zoom));
        $p[0] = (($_tile_x / pow(2.0, $_zoom) * 360.0) - 180.0);
        $p[1] = (180.0 / pi() * atan(sinh($n)));
        return $p;
    }

}
?>