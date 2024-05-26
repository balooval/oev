<?php
class Api_ign extends Api_default {

    public $contentType = 'image/png';
    // public $contentType = 'text';
    // public $contentType = 'text/html';
    protected $dirCache = PATH_CACHE . 'ign_alti';
    private $dirRaw = PATH_DATAS . 'rge_alti';
    private $params;

    public function __construct($params) {
        // $this->useCache = false;
        $this->params = $params;
        parent::__construct($params);
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if ($this->mustFetchDatas($filePath)) {
            $this->buildElevationImage($filePath);
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
                
                if ($tmpElevation == 0) {
                    // echo '$tmpElevation : ' . $tmpElevation . '<br>';
                }
                
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
            // echo 'FIX $indexY' . '<br>';
            $indexY = 0;
            $lambertY -= 1;
        }
        
        $file = $this->getEleFileFromCoord($lambertX, $lambertY);

        
        $fh = fopen($file, 'r') or die("Error opening $file. Aborting!");
        
        for ($i = 0; $i < 6; $i ++) {
            $line = fgets($fh);
        }
        
        $curY = 0;
        
        while (($line = fgets($fh)) !== false) {
            
            if ($curY == $indexY) {
                $values = explode(' ', trim($line));
                $ele = round($values[$indexX]); // TODO : gérer les centimetres dans l'image retournée
                return $ele;
            }

            $curY ++;
        }


        fclose($fh);

        // echo 'NO FOUND, $indexY : ' . $indexY . ', $indexX : ' . $indexX . '<br>';
        // echo '$lambertX : ' . $lambertX . ', $lambertY : ' . $lambertY . '<br>';
        // echo '$file : ' . basename($file) . '<br>';
        // echo '<br>';

        return 0;
    }

    protected function getEleFileFromCoord($x, $y) {
        $x = floor($x / 1000);
        $x = str_pad($x, 4, '0', STR_PAD_LEFT);

        $y = floor($y / 1000);
        $y += 1;
        $y = str_pad($y, 4, '0', STR_PAD_LEFT);

        $fileName = $this->dirRaw . '/' . 'RGEALTI_FXX_' . $x . '_' . $y . '_MNT_LAMB93_IGN69.asc';

        if (!is_file($fileName)) {
            // echo 'file ' . $fileName . ' not exist' . PHP_EOL;
            exit;
        }

        return $fileName;
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