<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
define('PATH_CACHE', dirname(__FILE__) . '/../cache/');
require_once(dirname(__FILE__) . '/res_default.php');
$ressource = $_GET['ressource'];
require_once('res_' . $ressource . '.php');
$className = 'Api_' . $ressource;
$handler = new $className($_GET);
header('Content-type: ' . $handler->contentType);
echo $handler->process();
?>