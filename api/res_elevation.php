<?php
class Api_elevation extends Api_default {

    public $contentType = 'image/png';
    protected $dirCache = PATH_CACHE . 'srtm_3';
    private $dirRaw = PATH_CACHE . '../srtm_unpack';
    private $params;

    public function __construct($_params) {
        $this->params = $_params;
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if (!is_file($filePath)) $this->buildElevationImage($filePath);
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

    private function buildElevationImage($_filePath) {
        $x = $this->params['x'];
        $y = $this->params['y'];
        $z = $this->params['z'];
        $def = $this->params['def'];
        $startC = $this->tileToCoords($x, $y, $z);
        $endC = $this->tileToCoords($x + 1, $y + 1, $z);
        $south = $endC[1];
        $north = $startC[1];
        $east = $startC[0];
        $west = $endC[0];
        $stepLat = ($north - $south) / $def;
        $stepLon = ($west - $east) / $def;
        $imageObject = imagecreatetruecolor($def + 1, $def + 1);
        $pixX = 0;
        $pixY = 0;
        $elevation = 0;
        for ($curLon = $east; $curLon <= $west; $curLon += $stepLon) {
            for ($i = 0; $i <= $def; $i ++) {
                $curLat = ($north - ($i * $stepLat));
                $tmpElevation = $this->extractElevation($curLat, $curLon);
                if ($tmpElevation < 10000) {
                    $elevation = $tmpElevation;
                }
                $red = floor($elevation / 256);
                $blue = $elevation - ($red * 256);
                $green = 0;
                $pixColor = imagecolorallocate($imageObject, $red, $green, $blue);
                imagesetpixel($imageObject, $pixX, $pixY, $pixColor);
                $pixY ++;
            }
            $pixX ++;
            $pixY = 0;
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