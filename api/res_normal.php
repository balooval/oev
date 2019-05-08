<?php
class Api_normal extends Api_default {

    public $contentType = 'image/png';
    protected $dirCache = PATH_CACHE . 'normal';
    private $dirRaw = PATH_CACHE . '../srtm_unpack';
    private $params;
    private $differenceReduction = 100;

    // Erreurs 500 :
    // https://val.openearthview.net/api/index.php?ressource=normal&z=12&x=2094&y=1495&def=16
    // https://val.openearthview.net/api/index.php?ressource=normal&z=11&x=1049&y=748&def=16

    public function __construct($_params) {
        $this->params = $_params;
        parent::__construct($_params);
    }
    
    public function process() {
        $filePath = $this->dirCache . '/' . $this->buildFilePath($this->params);
        $this->makeFolders([$this->params['z'], $this->params['x'], $this->params['y']]);
        if ($this->mustFetchDatas($filePath)) $this->buildNormalImage($filePath);
        return file_get_contents($filePath);
    }

    private function mustFetchDatas($_filePath) {
        if (!$this->useCache) return true;
        if (!is_file($_filePath)) return true;
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

    private function colorFromSlope($_eleA, $_eleB) {
        $difference = $_eleA - $_eleB;
        $difference = ($difference / $this->differenceReduction) * 127;
        $difference = max(-127, $difference);
        $difference = min(127, $difference);
        $color = 128 + round($difference);
        return $color;
    }

    private function buildNormalImage($_filePath) {
        set_time_limit(60);
        $x = $this->params['x'];
        $y = $this->params['y'];
        $z = $this->params['z'];
        $multiplier = 8;
        if ($z == 14) $multiplier = 4;
        if ($z == 15) $multiplier = 2;
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
        $imgColors = [];
        for ($x = 0; $x <= $def; $x ++) {
            $imgColors[] = [];
            for ($y = 0; $y <= $def; $y ++) {
                $imgColors[$x][] = [
                    127, 
                    127, 
                ];
            }
        }
        for ($x = 0; $x <= $def; $x ++) {
            for ($y = 0; $y <= $def; $y ++) {
                $curLon = ($east + ($x * $stepLon));
                $curLat = ($north - ($y * $stepLat));
                $curStartPosition = $this->calcFileReadStartPosition($curLat, $curLon);
                $curElevation = $this->extractElevation($curLat, $curLon);
                $searchY = 0;
                while (true) {
                    $searchY ++;
                    if ($searchY > 10) {
                        die ('overflow');
                        $searchElevation = $curElevation;
                        break;
                    }
                    $searchLon = ($east + ($x * $stepLon));
                    $searchLat = ($north - (($y + $searchY) * $stepLat));
                    $searchStartPosition = $this->calcFileReadStartPosition($searchLat, $searchLon);
                    if ($searchStartPosition == $curStartPosition) continue;
                    $searchElevation = $this->extractElevation($searchLat, $searchLon);
                    break;
                }
                $imgColors[$x][$y][1] = $this->colorFromSlope($curElevation, $searchElevation);
            }
        }
        for ($y = 0; $y <= $def; $y ++) {
            for ($x = 0; $x <= $def; $x ++) {
                $curLon = ($east + ($x * $stepLon));
                $curLat = ($north - ($y * $stepLat));
                $curStartPosition = $this->calcFileReadStartPosition($curLat, $curLon);
                $curElevation = $this->extractElevation($curLat, $curLon);
                $searchX = 0;
                while (true) {
                    $searchX ++;
                    if ($searchX > 10) {
                        die ('overflow');
                        $searchElevation = $curElevation;
                        break;
                    }
                    $searchLon = ($east + (($x + $searchX) * $stepLon));
                    $searchLat = ($north - ($y * $stepLat));
                    $searchStartPosition = $this->calcFileReadStartPosition($searchLat, $searchLon);
                    if ($searchStartPosition == $curStartPosition) continue;
                    $searchElevation = $this->extractElevation($searchLat, $searchLon);
                    break;
                }
                $imgColors[$x][$y][0] = $this->colorFromSlope($curElevation, $searchElevation);
            }
        }
        foreach ($imgColors as $x => $row) {
            foreach ($row as $y => $pixel) {
                $pixColor = imagecolorallocate($imageObject, $pixel[0], $pixel[1], 255);
                imagesetpixel($imageObject, $x, $y, $pixColor);
            }
        }
        imagepng($imageObject, $_filePath, 9);
        imagedestroy($imageObject);
    }

    private function calcFileReadStartPosition($_lat, $_lon) {
        $measPerDeg = 1201; // 3 second data
        $filePath = $this->dirRaw . '/' . $this->getEleFileFromCoord($_lat, $_lon);
        if (!is_file($filePath)) die('File ' . $filePath . ' not exist.');
        $fileName = basename($filePath);
        $starty = substr($fileName, 1, 2);
        if (substr($fileName, 0, 1) == "S") $starty = -$starty;
        $startx = +substr($fileName, 4, 3);
        if (substr($fileName, 3, 1) == "W") $startx = -$startx;
        $colStep = 1 / $measPerDeg;
        $colDest = floor((($starty + 1) - $_lat) / $colStep);
        $rowDest = floor(($_lon - $startx) / $colStep);
        $readStartPosition = $colDest * (2 * $measPerDeg);
        $readStartPosition += $rowDest * 2;
        return $readStartPosition;
    }

    private function extractElevation($_lat, $_lon) {
        $readStartPosition = $this->calcFileReadStartPosition($_lat, $_lon);
        $filePath = $this->dirRaw . '/' . $this->getEleFileFromCoord($_lat, $_lon);
        $fileRessource = fopen($filePath, 'rb') or die('Error opening ' . $filePath . '. Aborting!');
        fseek($fileRessource, $readStartPosition);
        $binaryDatas = fread($fileRessource, 2);
        $parsedDatas = unpack("n*", $binaryDatas);
        $altitude = array_shift($parsedDatas);
        if ($altitude > 30000) {
            $readStartPosition = max(0, $readStartPosition - 2 * 50);
            for ($i = 0; $i < 100; $i ++) {
                if ($altitude > 30000) {
                    $readStartPosition += 2;
                    fseek($fileRessource, $readStartPosition);
                    $binaryDatas = fread($fileRessource, 2);
                    $parsedDatas = unpack("n*", $binaryDatas);
                    $altitude = array_shift($parsedDatas);
                } else {
                    break;
                }
            }
        }
        fclose($fileRessource);
        if ($altitude > 10000) {
            $altitude = 0;
        }
        return $altitude;
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