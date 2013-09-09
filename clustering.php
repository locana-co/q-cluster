<?php
	// php error checking
	error_reporting(E_ALL);
	ini_set('display_errors', 1);
	ini_set('memory_limit', '300M');
	// Turn on the PHP debugger for Chrome
//	require_once('PhpConsole.php');

	$gPoints = null; 

	function makeClusters($points, $resolution) {
		global $gPoints;
		$gPoints = $points;
        $c;
        $index;
        $i;
        $clusters = array();
        $currentCluster = null;
        $count = count($points, 0);

        for ($index = 0; $index < $count; $index++) {
            if(!$gPoints[$index]['c']) {
            
                $currentCluster = array('points'=> array(), 'xSum'=> 0, 'ySum'=>0, 'c'=>null,'cX'=>null, 'cY'=>null);
        		
                 //look backwards in the list for any points within the range, return after we hit a point that exceeds range
                $c1 = addPinsWithinRange($index, -1, $resolution);
                //look forwards in the list for any points within the range, return after we hit a point that exceeds range 
               	$c2 = addPinsWithinRange($index, 1, $resolution);
               	
               	$currentCluster['c'] = TRUE;
                $currentCluster['points'] = $c1 + $c2 + $points[$index];
                
                // Add the cluster to the storage array
                $clusters[] = $currentCluster;
            }
        }
 
        $clusCnt = count($clusters); 
        // Loop thru the created clusters and find the center of all cluster points
      
        for($i = 0; $i < $clusCnt; $i++) {
        	$ids = array();
            for($j = 0; $j < count($clusters[$i]['points']); $j++) {
            	if (isset($clusters[$i]['points'][$j]['X'])) {
	                $clusters[$i]['xSum'] = $clusters[$i]['xSum'] + $clusters[$i]['points'][$j]['X'];
	                $clusters[$i]['ySum'] = $clusters[$i]['ySum'] + $clusters[$i]['points'][$j]['Y'];
	                if (isset($clusters[$i]['points'][$j]['ID']))
	                	$ids[] = $clusters[$i]['points'][$j]['ID'];
            	}
            }
            $clusters[$i]['cX'] = $clusters[$i]['xSum'] / count($clusters[$i]);
            $clusters[$i]['cY'] = $clusters[$i]['ySum'] / count($clusters[$i]);
            $clusters[$i]['points'] = $ids;
        }
        return $clusters;
	}

    function addPinsWithinRange($index, $direction, $resolution) {
    	global $gPoints;
    	$cc = array('points'=>null);
        $currentCluster;
        //Cluster width & heigth are in pixels. So any point within 20 pixels at the zoom level will be clustered.
        $clusterwidth = 100; //Cluster region width, all pin within this area are clustered
        $finished = FALSE;
        $searchindex = $index + $direction;
        
        $pMax = count($gPoints);
 
        while ($finished === FALSE)
        {
            if ($searchindex >= $pMax || $searchindex < 0)
            {
                $finished = TRUE;
            }
            else
            {
                // if this point not already clustered
                if($gPoints[$searchindex]['c'] == FALSE) {
                  
                   
                    //find distance between two points at specified indexes
                    $xDis = abs($gPoints[$searchindex]['X'] - $gPoints[$index]['X'])/ $resolution;
                    $yDis = abs($gPoints[$searchindex]['Y'] - $gPoints[$index]['Y']) / $resolution;
                    
                    
                    if ( $xDis < $clusterwidth && $yDis < $clusterwidth) //within the same y range = cluster needed
                        {
                        	// add search point to cluster
                            $cc['points'][] = $gPoints[$searchindex];
                            // var_dump($searchPoint);
                           	// var_dump($currentcluster);
                            //this point represents a cluster...
                            $cc['c'] = TRUE;
                            $gPoints[$searchindex]['c'] = TRUE;
                         
                        }
                    else
                    {
                        $finished = TRUE;
                    }
                }
                $searchindex += $direction;
            }
        }  
        // var_dump(count($cc['points']));
        return (count($cc['points']) > 0) ? $cc['points'] : array();
    }
?>