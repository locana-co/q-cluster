var qCluster = {};

// NOTE: for this to work, the input point array must be sorted a one-dimensional geographic coordinate notation code, e.g GEOREF
qCluster.makeClusters = function(pointArr, resolution) {
	
	var c,
		index,
		i;
	var clusters = [];
	var currentCluster;
	
	// Make a copy of points array and while doing so add a property 'c' for clustered
	var points = $.extend(true, [], pointArr, {c:null});

	// loop thru the point array
	for (index = 0, indexMax = points.length; index < indexMax; index++)
    {
    	
    	if (!points[index].c) //skip already clustered pins
        {
        	
        	currentCluster = {'points':[], 'xSum': 0, 'ySum':0, 'cX':null, 'cY':null};
        	currentCluster.points.push(points[index]);
        	
        	//look backwards in the list for any points within the range, return after we hit a point that exceeds range
        	qCluster.AddPinsWithinRange(points, index, -1, currentCluster, resolution);
 
            //look forwards in the list for any points within the range, return after we hit a point that exceeds range 
            qCluster.AddPinsWithinRange(points, index, 1, currentCluster, resolution);
 			
 			// Add the cluster to the storage array
 			clusters.push(currentCluster);
        }
    }
	
	// Loop thru the created clusters and find the center of all cluster points
	for(i =0, iMax = clusters.length; i < iMax; i++) {
		
		c = clusters[i];
		
		for(j =0, jMax = c.points.length; j < jMax; j++) {
		
		c.xSum = c.xSum + c.points[j].X;
		c.ySum = c.ySum + c.points[j].Y;
		
		}
		c.cX = c.xSum / c.points.length;
		c.cY = c.ySum / c.points.length;
		
		
		delete c.xSum;
		delete c.ySum;	
	}
	
	return clusters;
};

qCluster.AddPinsWithinRange = function(points, index, direction, currentCluster, resolution){
	
	//Cluster width & heigth are in pixels. So any point within 20 pixels at the zoom level will be clustered.
    var clusterwidth = 100; //Cluster region width, all pin within this area are clustered
	var finished = false;
    var searchindex = index + direction;
    var pMax = points.length;

	while (!finished)
    {
    	
    	if (searchindex >= pMax || searchindex < 0)
        {
            finished = true;
        }
        else
        {
        	if (!points[searchindex].c)
            {
                //find distance between two points at specified indexes
                var xDis = Math.abs(points[searchindex].X - points[index].X) / resolution;
                var yDis = Math.abs(points[searchindex].Y - points[index].Y) / resolution;
                if ( xDis < clusterwidth) //within the same x range
                {
                    if (yDis < clusterwidth) //within the same y range = cluster needed
                    {
                        //add to cluster
                        currentCluster.points.push(points[searchindex]);
                      	//currentCluster.xSum = currentCluster.xSum + points[index].X;
                      	//currentCluster.ySum = currentCluster.ySum + points[index].Y;
                        //this point represents a cluster...
                        currentCluster.c = true;
                        
                        points[searchindex].c = true;
					}
				}
				else
            	{
                	finished = true;
            	}

            }
       	 	searchindex += direction;
   		}
        
    }	
};






