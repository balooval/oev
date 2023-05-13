<?php
// header('Content-type: text/html');
ini_set('display_errors', 1);
error_reporting(E_ALL);

define('PATH_SRC', dirname(__FILE__) . '/../cache/coastbaked_test/10');
define('PATH_DEST', dirname(__FILE__) . '/../cache/coastbaked/10');


class Toto {

    static private $curDepth = 0;
    static private $maxDepth = 10;

    static public function parseDir($_path) {
        // self::$curDepth ++;
        // if (self::$curDepth > self::$maxDepth) {
        //     return;
        // }
        
        $files = scandir($_path);
        foreach ($files as $file) {
            $curPath = $_path . '/' . $file;
            if ($file == '.' || $file == '..') continue;
            if (is_dir($curPath)) {
                // echo 'Enter ' . $curPath . ' :<br>';
                self::parseDir($curPath);
            } else if ($file == 'shapes.json') {
                $destPath = str_replace(PATH_SRC, PATH_DEST, $curPath);
                // echo $curPath . '<br>';
                // echo $destPath . '<br>';
                self::moveTo($curPath, $destPath);
            }
        }
        
    }
    
    static private function moveTo($_srcFile, $_destPath) {
        if (is_file($_destPath)) {
            echo 'ALREADY exist : ' . $_destPath . '<br>';
            // echo $_srcFile . '<br>';
            // echo $_destPath . '<br>';
            $srcShapes = self::getCurrentShapes($_srcFile);
            $destShapes = self::getCurrentShapes($_destPath);
            // echo '$srcShapes : ' . count($srcShapes) . '<br>';
            // print_r($srcShapes);
            // echo '<br><br>';
            // echo '$destShapes : ' . count($destShapes) . '<br>';
            // print_r($destShapes);
            // echo '<br><br>';
            $destShapes[] = $srcShapes;
            // echo '$destShapes B : ' . count($destShapes) . '<br>';
            // print_r($destShapes);
            // echo '<br><br>';
            file_put_contents($_destPath, json_encode($destShapes));
            $moveName = str_replace('shapes.json', 'moved.json', $_srcFile);
            echo '$moveName: ' . $moveName . '<br>';
            rename($_srcFile, $moveName);
            // exit();
        } else {
            $destFolder = str_replace('shapes.json', '', $_destPath);
            echo 'EMPTY, move :<br>' . $_srcFile . '<br>TO<br>' . $destFolder . '<br>';
            exec('mkdir -p ' . $destFolder);
            rename($_srcFile, $_destPath);
            // exit();
        }
    }

    static private function getCurrentShapes($_path) {
        if (is_file($_path)) {
            return json_decode(file_get_contents($_path));
        }
        return [];
    }
    
}


Toto::parseDir(PATH_SRC);
?>