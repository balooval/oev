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

    protected function coordToLambert($longitude, $latitude) {
        //variables:
        $a = 6378137; //demi grand axe de l'ellipsoide (m)
        $e = 0.08181919106; //première excentricité de l'ellipsoide
        $l0 = $lc=deg2rad(3);
        $phi0 = deg2rad(46.5); //latitude d'origine en radian
        $phi1 = deg2rad(44); //1er parallele automécoïque
        $phi2 = deg2rad(49); //2eme parallele automécoïque
            
        $x0 = 700000; //coordonnées à l'origine
        $y0 = 6600000; //coordonnées à l'origine
            
        $phi = deg2rad($latitude);
        $l = deg2rad($longitude);
            
        //calcul des grandes normales
        $gN1 = $a/sqrt(1-$e*$e*sin($phi1)*sin($phi1));
        $gN2 = $a/sqrt(1-$e*$e*sin($phi2)*sin($phi2));
            
        //calculs des latitudes isométriques
        $gl1 = log(tan(pi()/4+$phi1/2)*pow((1-$e*sin($phi1))/(1+$e*sin($phi1)),$e/2));
        $gl2 = log(tan(pi()/4+$phi2/2)*pow((1-$e*sin($phi2))/(1+$e*sin($phi2)),$e/2));
        $gl0 = log(tan(pi()/4+$phi0/2)*pow((1-$e*sin($phi0))/(1+$e*sin($phi0)),$e/2));
        $gl = log(tan(pi()/4+$phi/2)*pow((1-$e*sin($phi))/(1+$e*sin($phi)),$e/2));
            
        //calcul de l'exposant de la projection
        $n = (log(($gN2 * cos($phi2)) / ($gN1 * cos($phi1)))) / ($gl1 - $gl2);
            
        //calcul de la constante de projection
        $c = (($gN1 * cos($phi1)) / $n) * exp($n * $gl1);
            
        //calcul des coordonnées
        $ys = $y0 + $c * exp(-1 * $n * $gl0);
            
        $x93 = $x0 + $c * exp(-1 * $n * $gl) * sin($n * ($l - $lc));
        $y93 = $ys - $c * exp(-1 * $n * $gl) * cos($n * ($l - $lc));

        return [
            $x93,
            $y93,
        ];
    }

    protected function lambert93ToWgs84($x, $y) {
        $x = number_format($x, 10, '.', '');
        $y = number_format($y, 10, '.', '');
        $b6  = 6378137.0000;
        $b7  = 298.257222101;
        $b8  = 1/$b7;
        $b9  = 2*$b8-$b8*$b8;
        $b10 = sqrt($b9);
        $b13 = 3.000000000;
        $b14 = 700000.0000;
        $b15 = 12655612.0499;
        $b16 = 0.7256077650532670;
        $b17 = 11754255.426096;
        $delx = $x - $b14;
        $dely = $y - $b15;
        $gamma = atan( -($delx) / $dely );
        $r = sqrt(($delx*$delx)+($dely*$dely));
        $latiso = log($b17/$r)/$b16;
        $sinphiit0 = tanh($latiso+$b10*atanh($b10*sin(1)));
        $sinphiit1 = tanh($latiso+$b10*atanh($b10*$sinphiit0));
        $sinphiit2 = tanh($latiso+$b10*atanh($b10*$sinphiit1));
        $sinphiit3 = tanh($latiso+$b10*atanh($b10*$sinphiit2));
        $sinphiit4 = tanh($latiso+$b10*atanh($b10*$sinphiit3));
        $sinphiit5 = tanh($latiso+$b10*atanh($b10*$sinphiit4));
        $sinphiit6 = tanh($latiso+$b10*atanh($b10*$sinphiit5));
        $longrad = $gamma/$b16+$b13/180*pi();
        $latrad = asin($sinphiit6);
        $long = ($longrad/pi()*180);
        $lat  = ($latrad/pi()*180);

        return [
            'lat' => $lat,
            'lon' => $long
        ];
    }
}
?>