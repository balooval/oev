<html>
	<head>
		<title>OpenEarthView</title>
		<meta charset="UTF-8">
	</head>
<a href="index.php">RUN</a>
<br>
<a href="index.php">Index</a>
<br>
<br>
<a href="?getDiskUsage">Disk usage</a>
<br>
<?php
if( isset( $_GET['getDiskUsage'] ) ){
	echo `du -sh /home/valsite/www`;
	echo '<br>';
	if( isset( $_GET['getDiskDetails'] ) ){
		echo '<br>';
		echo `du -sh /home/valsite/www/cache`;
		echo '<br>';
		echo `du -sh /home/valsite/www/cache3d`;
		echo '<br>';
		echo `du -sh /home/valsite/www/cache_elevation`;
		echo '<br>';
		echo `du -sh /home/valsite/www/cacheModels`;
	}else{
		echo '<a href="?getDiskUsage=1&getDiskDetails=1">Details</a>';
	}
}

if( isset( $_GET['cleanElevation'] ) ){
	// echo `rm -rf /home/valsite/www/cache_elevation`;
}
?>
</html>