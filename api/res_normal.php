<?php
class Api_normal extends Api_default {

    public $contentType = 'image/png';
    protected $dirCache = PATH_CACHE . 'normal';
    private $dirRaw = PATH_CACHE . '../srtm_unpack';
    private $params;

    public function __construct($_params) {
        $this->params = $_params;
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if (!is_file($filePath)) $this->buildNormalImage($filePath);
        return file_get_contents($filePath);
    }

    private function buildFilePath($_param) {
        return implode('/', [
            $_param['z'], 
            $_param['x'], 
            $_param['y'], 
            ($_param['def'] + 1) . '.png', 
        ]);
    }

    private function buildNormalImage($_filePath) {
        $x = $this->params['x'];
        $y = $this->params['y'];
        $z = $this->params['z'];
        $multiplier = 8;
        $def = $this->params['def'] * $multiplier;
        $startC = $this->tileToCoords($x, $y, $z);
        $endC = $this->tileToCoords($x + 1, $y + 1, $z);
        $south = $endC[1];
        $north = $startC[1];
        $east = $startC[0];
        $west = $endC[0];
        $stepLat = ($north - $south) / $def;
        $stepLon = ($west - $east) / $def;
        $imageObject = imagecreatetruecolor($def, $def);
        $storedVect = [];
        $storedMaxLen = 1;
        for ($j = 0; $j <= $def; $j ++) {
            $storedVect[] = [];
            for ($i = 0; $i <= $def; $i ++) {
                $curLon = ($east + ($j * $stepLon));
                $curLat = ($north - ($i * $stepLat));
                $elevation = $this->extractElevation($curLat, $curLon);
                
                $lonXA = ($east + (($j - ($multiplier / 2)) * $stepLon));
                $elevationXA = $this->extractElevation($curLat, $lonXA);
                $lonXB = ($east + (($j + ($multiplier / 2)) * $stepLon));
                $elevationXB = $this->extractElevation($curLat, $lonXB);
                
                $latYA = ($north - (($i - ($multiplier / 2)) * $stepLat));
                $elevationYA = $this->extractElevation($latYA, $curLon);
                $latYB = ($north - (($i + ($multiplier / 2)) * $stepLat));
                $elevationYB = $this->extractElevation($latYB, $curLon);

                $vecX = [
                    1, 
                    0, 
                    $elevationXA - $elevationXB
                ];
                $vecY = [
                    0, 
                    1, 
                    $elevationYA - $elevationYB
                ];
                $vector = [
                    ($vecX[1] * $vecY[2]) - ($vecX[2] * $vecY[1]), 
                    ($vecX[2] * $vecY[0]) - ($vecX[0] * $vecY[2]), 
                    ($vecX[0] * $vecY[1]) - ($vecX[1] * $vecY[0])
                ];
                $vectLen = sqrt($vector[0] * $vector[0] + $vector[1] * $vector[1]);
                $storedMaxLen = max($storedMaxLen, $vectLen);
                $storedVect[$j][$i] = $vector;
            }
        }

        for ($x = 0; $x < $def; $x ++) {
            for ($y = 0; $y < $def; $y ++) {
                $vect = $storedVect[$x][$y];
                $vect[0] /= $storedMaxLen;
                $vect[1] /= $storedMaxLen;
                $vect[2] /= $storedMaxLen;
                $red = 255 - round((($vect[0] + 1) / 2) * 255);
                $green = 255 - round((($vect[1] + 1) / 2) * 255);
                // $blue = round((($vect[2] + 1) / 2) * 255);
                $pixColor = imagecolorallocate($imageObject, $red, $green, 255);
                imagesetpixel($imageObject, $x, $y, $pixColor);
            }
        }
        imagepng($imageObject, $_filePath, 9);
        imagedestroy($imageObject);
    }

    private function extractElevation($_lat, $_lon) {
        set_time_limit(30);
        $measPerDeg = 1201; // 3 second data
        $hgtfile = $this->dirRaw . '/' . $this->getEleFileFromCoord($_lat, $_lon);
        if (!is_file( $hgtfile)) return 0;
        $fh = fopen($hgtfile, 'rb') or die("Error opening $hgtfile. Aborting!");
        $hgtfile = basename($hgtfile);
        $starty = substr($hgtfile, 1, 2);
        if (substr($hgtfile, 0, 1) == "S") {
            $starty = -$starty;
        }
        $startx = +substr($hgtfile, 4, 3);
        if (substr($hgtfile, 3, 1) == "W") {
            $startx = -$startx;
        }
        $colStep = 1 / $measPerDeg;
        $colDest = floor((($starty + 1) - $_lat) / $colStep);
        $rowDest = floor(($_lon - $startx) / $colStep);
        $offset = $colDest * (2 * $measPerDeg);
        $offset += $rowDest * 2;
        fseek($fh, $offset);
        $tmp = fread($fh, 2);
        $res = unpack("n*", $tmp);
        $res = reset($res);
        if ($res > 30000) {
            $offset = max(0, $offset - 2 * 50);
            for ($i = 0; $i < 100; $i ++) {
                if ($res > 30000) {
                    $offset += 2;
                    fseek($fh, $offset);
                    $tmp = fread($fh, 2);
                    $res = unpack("n*", $tmp);
                    $res = reset($res);
                } else {
                    break;
                }
            }
        }
        fclose($fh);
        if ($res > 10000) {
            $res = 0;
        }
        return $res;
    }

    private function getEleFileFromCoord($_lat, $_lon) {
        $fileName = '';
        if ( $_lat > 0 ){
            $fileName .= 'N' . str_pad(floor($_lat-0.0001), 2, '0', STR_PAD_LEFT);
        } else {
            $fileName .= 'S' . str_pad(ceil(abs($_lat+0.0001)), 2, '0', STR_PAD_LEFT);
        }
        if ($_lon > 0) {
            $fileName .= 'E' . str_pad(floor($_lon), 3, '0', STR_PAD_LEFT);
        } else {
            $fileName .= 'W' . str_pad(floor(abs($_lon - 1)), 3, '0', STR_PAD_LEFT);
        }
        $fileName .= '.hgt';
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