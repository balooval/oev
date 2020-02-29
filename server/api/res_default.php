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
}
?>