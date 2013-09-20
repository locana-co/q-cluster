var QCluster = {};

// NOTE: for this to work, the input point object array must be sorted by a one-dimensional geographic coordinate notation code, e.g GEOREF
/**
 * 
 * @param [{Object}] pointArr - must contain properties x, y (linear units)
 * @param {Object} resolution - map resolution pixels/per linear distance unit (must be same unit as X,Y)
 * @param {Object} clusterTolerance - a pixel distance, within which points are clustered
 */
QCluster.makeClusters = function(pointArr, resolution, clusterTolerance, mapBounds) {
	
	var ctr = 0,
		c,
		index,
		i,
		clusters = [],
		currentCluster;
	
	// Make a copy of points array and while doing so add a property 'c' for clustered
	var points = pointArr;//$.extend(true, [], pointArr, {c:null});
	
	for (var i = 0, iMax = points.length; i < iMax; i++) {
		points[i]['c'] = null
	}

	// loop thru the point array
	for (index = 0, indexMax = points.length; index < indexMax; index++)
    {
    	
    	if (!points[index].c && QCluster.WithinMapBounds(points[index], mapBounds)) //skip already clustered pins
        {
        	
        	currentCluster = {'id': ctr, 'points':[], 'xSum': 0, 'ySum':0, 'cX':null, 'cY':null};
        	ctr++;
        	currentCluster.points.push(points[index]);
        	
        	//look backwards in the list for any points within the range, return after we hit a point that exceeds range
        	QCluster.AddPinsWithinRange(points, index, -1, currentCluster, resolution, clusterTolerance);
 
            //look forwards in the list for any points within the range, return after we hit a point that exceeds range 
            QCluster.AddPinsWithinRange(points, index, 1, currentCluster, resolution, clusterTolerance);
 			
 			// Add the cluster to the storage array
 			clusters.push(currentCluster);
        }
    }
	
	// Loop thru the created clusters and find the center of all cluster points
	for(i =0, iMax = clusters.length; i < iMax; i++) {
		
		c = clusters[i];
		
		// Average the x, y coordinates
		for(j =0, jMax = c.points.length; j < jMax; j++) {
		
			c.xSum = c.xSum + c.points[j].x;
			c.ySum = c.ySum + c.points[j].y;
		
		}
		c.cX = c.xSum / c.points.length;
		c.cY = c.ySum / c.points.length;
		
		// delete the coordinate sum properties
		delete c.xSum;
		delete c.ySum;	
	}
	
	return clusters;
};

QCluster.WithinMapBounds = function(point, mapBounds) {
	if(point.x > mapBounds.xmax || point.x < mapBounds.xmin || point.y > mapBounds.ymax || point.y < mapBounds.ymin ) {
		return false;
	}
	else {
		return true;
	}
}

QCluster.AddPinsWithinRange = function(points, index, direction, currentCluster, resolution, tolerance){
	
	var clusterwidth,
		finished,
		searchindex,
		pMax,
		xDis,
		yDis;
		

	//Cluster width & heigth are in pixels. So any point within 20 pixels at the zoom level will be clustered.
    clusterwidth = tolerance; // Cluster region width, all points within this area are clustered
	finished = false; // flag
    searchindex = index + direction;
    pMax = points.length;

	// Loop thru the points array
	while (!finished)
    {
    	
    	// Stop if outside array bounds
    	if (searchindex >= pMax || searchindex < 0)
        {
            finished = true;
        }
        else
        {
        	// continue if this point has not yet been placed into an existing cluster
        	if (!points[searchindex].c)
            {
                //find distance between two points ( the initial point and one of the other points 'close' to it).
                xDis = Math.abs(points[searchindex].x - points[index].x) / resolution;
                yDis = Math.abs(points[searchindex].y - points[index].y) / resolution;
                
                if ( xDis < clusterwidth) // the x distance between the two points is within the cluster tolerance
                {
                    if (yDis < clusterwidth) // the y distance between the two points is within the cluster tolerance
                    {
                        //add to cluster
                        currentCluster.points.push(points[searchindex]);
                      	
                      	//this point represents a cluster...
                        currentCluster.c = true;
                        
                        points[searchindex].c = true;
					}

						
				}
				else // we have reached a point whose x distance from the initial point is > the cluster tolerance
            	{
					/* We have reached a point whose y distance from the initial point is > the cluster tolerance
					/ we assume subsequent points in the list will also be beyond the cluster tolerance since the 
					/ the list is sorted by location grid (GEOREF)
					*/
                	finished = true;
            	}

            }
            //increment the search index
       	 	searchindex += direction;
   		}
        
    }	
};

