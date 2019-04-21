<?php
abstract class Api_default {

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