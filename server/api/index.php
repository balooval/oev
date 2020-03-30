<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Access-Control-Allow-Origin: "*"');
header('Access-Control-Allow-Methods: "POST, GET, OPTIONS, DELETE, PUT"');
header('Access-Control-Allow-Headers: "x-requested-with, Content-Type, origin, authorization, accept, client-security-token"');

define('PATH_DATAS', dirname(__FILE__) . '/../../datas/');
define('PATH_CACHE', dirname(__FILE__) . '/../../cache/');
require_once(dirname(__FILE__) . '/res_default.php');
$ressource = $_GET['ressource'];
require_once('res_' . $ressource . '.php');
$className = 'Api_' . $ressource;
$handler = new $className($_GET);
header('Content-type: ' . $handler->contentType);
echo $handler->process();

?>