<?php
abstract class Api_default {

    protected $useCache = true;

    public function __construct($_params) {
        if (isset($_params['cache']) && $_params['cache'] == 0) {
            $this->useCache = false;
        }
    }

    abstract public function process();

    public function makeFolders($_folders) {
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

    protected function tileToCoords($_tile_x, $_tile_y, $_zoom) {
        $p = [0, 0];
        $n = pi() - ((2.0 * pi() * $_tile_y) / pow(2.0, $_zoom));
        $p[0] = (($_tile_x / pow(2.0, $_zoom) * 360.0) - 180.0);
        $p[1] = (180.0 / pi() * atan(sinh($n)));
        return $p;
    }

    // de lon -10 à lon 20 (France metropole)
    protected function coordToLambert($longitude, $latitude) {
        if ($longitude > -10 && $longitude < 20) {
            return $this->coordToLambertMetropole($longitude, $latitude);
        }

        // de lon -85 à -55 (Antilles)
        $res = ll2utm($latitude, $longitude);
        $meta = $this->getMeta($latitude, $longitude);
        return [
            'zone' => $meta['zone'],
            'eleRef' => $meta['eleRef'],
            'projection' => 'WGS84UTM20',
            'x' => $res['attr']['x'],
            'y' => $res['attr']['y'],
        ];
    }

    private function getMeta($latitude, $longitude) {
         // Martinique
        if ($latitude > 14.2 && $latitude < 15) {
            return [
                'zone' => 'MTQ',
                'eleRef' => 'MART87',
            ];
        }

        /// Guadeloupe
        if ($latitude > 15.9 && $latitude < 16.6) {
            return [
                'zone' => 'GLP',
                'eleRef' => 'GUAD88',
            ];
        }
    }

    protected function coordToLambertMetropole($longitude, $latitude) {
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
            'zone' => 'FXX',
            'eleRef' => 'IGN69',
            'projection' => 'LAMB93',
            'x' => $x93,
            'y' => $y93,
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



// TODO : pour gérer les données aux antilles

function utm2ll($x,$y,$zone,$aboveEquator){
    if(!is_numeric($x) or !is_numeric($y) or !is_numeric($zone)){
        return json_encode(array('success'=>false,'msg'=>"Wrong input parameters"));
    }
    $southhemi = false;
    if($aboveEquator!=true){
        $southhemi = true;
    }
    $latlon = UTMXYToLatLon ($x, $y, $zone, $southhemi);
    return json_encode(array('success'=>true,'attr'=>array('lat'=>radian2degree($latlon[0]),'lon'=>radian2degree($latlon[1]))));
}
function ll2utm($lat,$lon){
    if(!is_numeric($lon)){
        return json_encode(array('success'=>false,'msg'=>"Wrong longitude value"));
    }
    if($lon<-180.0 or $lon>=180.0){
        return json_encode(array('success'=>false,'msg'=>"The longitude is out of range"));
    }
    if(!is_numeric($lat)){
        return json_encode(array('success'=>false,'msg'=>"Wrong latitude value"));
    }
    if($lat<-90.0 or $lat>90.0){
        return json_encode(array('success'=>false,'msg'=>"The longitude is out of range"));
    }
    $zone = floor(($lon + 180.0) / 6) + 1;
    //compute values
    $result = LatLonToUTMXY(degree2radian($lat),degree2radian($lon),$zone);
    $aboveEquator = false;
    if($lat >0){
        $aboveEquator = true;
    }
    return [
        'success'=>true,
        'attr'=>[
            'x'=>$result[0],
            'y'=>$result[1],
            'zone'=>$zone,
            'aboveEquator'=>$aboveEquator,
        ]
    ];
}

function radian2degree($rad){
    $pi = 3.14159265358979;	
        return ($rad / $pi * 180.0);
}

function degree2radian($deg){
    $pi = 3.14159265358979;
    return ($deg/180.0*$pi);
}

function UTMCentralMeridian($zone){
    $cmeridian = degree2radian(-183.0 + ($zone * 6.0));
    return $cmeridian;
}
function LatLonToUTMXY ($lat, $lon, $zone){
        $xy = MapLatLonToXY ($lat, $lon, UTMCentralMeridian($zone));
    /* Adjust easting and northing for UTM system. */
    $UTMScaleFactor = 0.9996;
        $xy[0] = $xy[0] * $UTMScaleFactor + 500000.0;
        $xy[1] = $xy[1] * $UTMScaleFactor;
        if ($xy[1] < 0.0)
            $xy[1] = $xy[1] + 10000000.0;
        return $xy;
}
function UTMXYToLatLon ($x, $y, $zone, $southhemi){
    $latlon = array();
    $UTMScaleFactor = 0.9996;
        $x -= 500000.0;
        $x /= $UTMScaleFactor;
        /* If in southern hemisphere, adjust y accordingly. */
        if ($southhemi)
            $y -= 10000000.0;
        $y /= $UTMScaleFactor;
        $cmeridian = UTMCentralMeridian ($zone);
        $latlon = MapXYToLatLon ($x, $y, $cmeridian);	
        return $latlon;
}
function MapXYToLatLon ($x, $y, $lambda0){
    $philambda = array();
    $sm_b = 6356752.314;
    $sm_a = 6378137.0;
    $UTMScaleFactor = 0.9996;
    $sm_EccSquared = .00669437999013;
        $phif = FootpointLatitude ($y);
        $ep2 = (pow ($sm_a, 2.0) - pow ($sm_b, 2.0)) / pow ($sm_b, 2.0);
        $cf = cos ($phif);
        $nuf2 = $ep2 * pow ($cf, 2.0);
        $Nf = pow ($sm_a, 2.0) / ($sm_b * sqrt (1 + $nuf2));
        $Nfpow = $Nf;
        $tf = tan ($phif);
        $tf2 = $tf * $tf;
        $tf4 = $tf2 * $tf2;
        $x1frac = 1.0 / ($Nfpow * $cf);
        $Nfpow *= $Nf;   
        $x2frac = $tf / (2.0 * $Nfpow);
        $Nfpow *= $Nf;   
        $x3frac = 1.0 / (6.0 * $Nfpow * $cf);
        $Nfpow *= $Nf;   
        $x4frac = $tf / (24.0 * $Nfpow);
        $Nfpow *= $Nf;   
        $x5frac = 1.0 / (120.0 * $Nfpow * $cf);
        $Nfpow *= $Nf;   
        $x6frac = $tf / (720.0 * $Nfpow);
        $Nfpow *= $Nf;   
        $x7frac = 1.0 / (5040.0 * $Nfpow * $cf);
        $Nfpow *= $Nf;   
        $x8frac = $tf / (40320.0 * $Nfpow);
        $x2poly = -1.0 - $nuf2;
        $x3poly = -1.0 - 2 * $tf2 - $nuf2;
        $x4poly = 5.0 + 3.0 * $tf2 + 6.0 * $nuf2 - 6.0 * $tf2 * $nuf2- 3.0 * ($nuf2 *$nuf2) - 9.0 * $tf2 * ($nuf2 * $nuf2);
        $x5poly = 5.0 + 28.0 * $tf2 + 24.0 * $tf4 + 6.0 * $nuf2 + 8.0 * $tf2 * $nuf2;
        $x6poly = -61.0 - 90.0 * $tf2 - 45.0 * $tf4 - 107.0 * $nuf2	+ 162.0 * $tf2 * $nuf2;
        $x7poly = -61.0 - 662.0 * $tf2 - 1320.0 * $tf4 - 720.0 * ($tf4 * $tf2);
        $x8poly = 1385.0 + 3633.0 * $tf2 + 4095.0 * $tf4 + 1575 * ($tf4 * $tf2);
        $philambda[0] = $phif + $x2frac * $x2poly * ($x * $x)
            + $x4frac * $x4poly * pow ($x, 4.0)
            + $x6frac * $x6poly * pow ($x, 6.0)
            + $x8frac * $x8poly * pow ($x, 8.0);
        
        $philambda[1] = $lambda0 + $x1frac * $x
            + $x3frac * $x3poly * pow ($x, 3.0)
            + $x5frac * $x5poly * pow ($x, 5.0)
            + $x7frac * $x7poly * pow ($x, 7.0);
        
        return $philambda;
}

function FootpointLatitude ($y){
    $sm_b = 6356752.314;
    $sm_a = 6378137.0;
    $UTMScaleFactor = 0.9996;
    $sm_EccSquared = .00669437999013;
        $n = ($sm_a - $sm_b) / ($sm_a + $sm_b);
        $alpha_ = (($sm_a + $sm_b) / 2.0)* (1 + (pow ($n, 2.0) / 4) + (pow ($n, 4.0) / 64));
        $y_ = $y / $alpha_;
        $beta_ = (3.0 * $n / 2.0) + (-27.0 * pow ($n, 3.0) / 32.0)+ (269.0 * pow ($n, 5.0) / 512.0);
        $gamma_ = (21.0 * pow ($n, 2.0) / 16.0)+ (-55.0 * pow ($n, 4.0) / 32.0);
        $delta_ = (151.0 * pow ($n, 3.0) / 96.0)+ (-417.0 * pow ($n, 5.0) / 128.0);
        $epsilon_ = (1097.0 * pow ($n, 4.0) / 512.0);
        $result = $y_ + ($beta_ * sin (2.0 * $y_))
            + ($gamma_ * sin (4.0 * $y_))
            + ($delta_ * sin (6.0 * $y_))
            + ($epsilon_ * sin (8.0 * $y_));
        return $result;
}
function MapLatLonToXY ($phi, $lambda, $lambda0){
    $xy=array();
    $sm_b = 6356752.314;
    $sm_a = 6378137.0;
    $UTMScaleFactor = 0.9996;
    $sm_EccSquared = .00669437999013;
    $ep2 = (pow ($sm_a, 2.0) - pow ($sm_b, 2.0)) / pow ($sm_b, 2.0);
    $nu2 = $ep2 * pow (cos ($phi), 2.0);
    $N = pow ($sm_a, 2.0) / ($sm_b * sqrt (1 + $nu2));
    $t = tan ($phi);
    $t2 = $t * $t;
    $tmp = ($t2 * $t2 * $t2) - pow ($t, 6.0);
    $l = $lambda - $lambda0;
    $l3coef = 1.0 - $t2 + $nu2;
    $l4coef = 5.0 - $t2 + 9 * $nu2 + 4.0 * ($nu2 * $nu2);
    $l5coef = 5.0 - 18.0 * $t2 + ($t2 * $t2) + 14.0 * $nu2- 58.0 * $t2 * $nu2;
    $l6coef = 61.0 - 58.0 * $t2 + ($t2 * $t2) + 270.0 * $nu2- 330.0 * $t2 * $nu2;
    $l7coef = 61.0 - 479.0 * $t2 + 179.0 * ($t2 * $t2) - ($t2 * $t2 * $t2);
    $l8coef = 1385.0 - 3111.0 * $t2 + 543.0 * ($t2 * $t2) - ($t2 * $t2 * $t2);
    $xy[0] = $N * cos ($phi) * $l
            + ($N / 6.0 * pow (cos ($phi), 3.0) * $l3coef * pow ($l, 3.0))
            + ($N / 120.0 * pow (cos ($phi), 5.0) * $l5coef * pow ($l, 5.0))
            + ($N / 5040.0 * pow (cos ($phi), 7.0) * $l7coef * pow ($l, 7.0));
    $xy[1] = ArcLengthOfMeridian ($phi)
            + ($t / 2.0 * $N * pow (cos ($phi), 2.0) * pow ($l, 2.0))
            + ($t / 24.0 * $N * pow (cos ($phi), 4.0) * $l4coef * pow ($l, 4.0))
            + ($t / 720.0 * $N * pow (cos ($phi), 6.0) * $l6coef * pow ($l, 6.0))
            + ($t / 40320.0 * $N * pow (cos ($phi), 8.0) * $l8coef * pow ($l, 8.0));
    return $xy;
}
function ArcLengthOfMeridian($phi){
    $sm_b = 6356752.314;
    $sm_a = 6378137.0;
    $UTMScaleFactor = 0.9996;
    $sm_EccSquared = .00669437999013;
    $n = ($sm_a - $sm_b) / ($sm_a + $sm_b);
    $alpha = (($sm_a + $sm_b) / 2.0)
        * (1.0 + (pow ($n, 2.0) / 4.0) + (pow ($n, 4.0) / 64.0));
    $beta = (-3.0 * $n / 2.0) + (9.0 * pow ($n, 3.0) / 16.0)
           + (-3.0 * pow ($n, 5.0) / 32.0);
    $gamma = (15.0 * pow ($n, 2.0) / 16.0)
            + (-15.0 * pow ($n, 4.0) / 32.0);
    $delta = (-35.0 * pow ($n, 3.0) / 48.0)
            + (105.0 * pow ($n, 5.0) / 256.0);
    $epsilon = (315.0 * pow ($n, 4.0) / 512.0);
    $result = $alpha* ($phi + ($beta * sin (2.0 * $phi))
            + ($gamma * sin (4.0 * $phi))
            + ($delta * sin (6.0 * $phi))
        + ($epsilon * sin (8.0 * $phi)));
    return $result;
}
?>