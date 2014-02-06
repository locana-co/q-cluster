
var QCluster = (function(module){
	
	//Private Vars
	var map;
	
	// Private Functions
	function getBufferedMercatorMapBounds(bounds, resolution, edgeBuffer) {
		var xmin,
			xmax,
			ymin,
			ymax,
			mapEdgeBuffer;
		
		mapEdgeBuffer = edgeBuffer || 0;
		
		xmin = L.CRS.EPSG3857.project(bounds._southWest).x - edgeBuffer * resolution;
		xmax = L.CRS.EPSG3857.project(bounds._northEast).x + edgeBuffer * resolution;
		ymin = L.CRS.EPSG3857.project(bounds._southWest).y - edgeBuffer * resolution;
		ymax = L.CRS.EPSG3857.project(bounds._northEast).y + edgeBuffer * resolution;
		
		return {'xmin': xmin, 'xmax': xmax, 'ymin': ymin, 'ymax': ymax };
		
	}	
	
	function getResolution(leafletMap, bounds) {

		var xmin,
			xmax,
			bounds,
			mapWidth;
					
		mapWidth = leafletMap.getSize().x;
	
		xmin = L.CRS.EPSG3857.project(bounds._southWest).x;
		xmax = L.CRS.EPSG3857.project(bounds._northEast).x;
			
		return (xmax - xmin)/mapWidth; // meters/pixel
	}
	
	function sortGeoRef(a, b) {
		if (a.georef < b.georef)
			return -1;
		if (a.georef > b.georef)
			return 1;
		return 0;	
	} 
			
		
	module.PointClusterer = function(pointArr, layerId, map, opts){
		
		var options, pointArrLength, lng, lat, i, webMerc;
		
		options = opts || {};
		
		this.map = map;
		this.pointData = pointArr;
		this.tolerance = options.clusterTolerance || 130;
		this.mapEdgeBuffer = options.mapEdgeBuffer || 100;
		this.clusterCssClass = options.clusterCssClass || '';
		this.layerVisibility = (typeof options.layerVisibility === 'boolean') ? options.layerVisibility : true;
		this.reportingProperty = options.reportingProperty || null;
		
		pointArrLength = pointArr.length;
		
		this.pointData = [];
		
		for(i = pointArrLength - 1; i >= 0; i--) {
			
			lat = pointArr[i].lat;
			lng = pointArr[i].lng;
			
            // Convert to Web Mercator
			webMerc = L.CRS.EPSG3857.project(L.latLng(lat, lng));
			
            // Calculate georef and add it and web merc coords to object
			this.pointData.push($.extend(true, {
									georef: QCluster.Utils.geodeticToGeoRef(lng,lat,4),
									x: webMerc.x,
									y: webMerc.y
									}, pointArr[i]));
		}
		
        // Sort the array by georef
		this.pointData.sort(sortGeoRef);
			
		// Do the clustering
		this.makeClusters();
		
		//  When the map pans or zooms, fire this.mapMove
		this.map.on('moveend', this.mapMove, this);
		
		return this;
		
	};
	
	module.PointClusterer.prototype.makeClusters = function(map, layer, clusterTolerance, mapBounds) {
	
		var clusterArr, clusterDictionary, cnt,divHtml,divClass,myIcon,
			latlon,points,clusterMarker,classificationIds, mapBounds,
			resolution, webMercMapBounds, clusterLength, i
			clusterMarkers = [];
	
		// If map is not visible, don't proceed
		if(!$(this.map._container).is(":visible")) {
			return;
		}
		
		// If the PointCluster's layer property is defined, remove it from map; we recluster and add the layer back
		if(typeof this.layer !== 'undefined') {
            
            // TODO: prob need to unbind cluster click events...?
			this.map.removeLayer(this.layer);
		}		
		
        // Calculate the extent bounds
		mapBounds = this.map.getBounds();
		
        // Calculate the map's resolutions (px/meter)
		resolution = getResolution(this.map, mapBounds);
		
        // Convert map bounds to web merc and add buffer (px) if one has been passed
		webMercMapBounds = getBufferedMercatorMapBounds(mapBounds, resolution, this.mapEdgeBuffer);
		
        // Cluster the points
		clusterArr = module.clusterPoints(this.pointData, webMercMapBounds, resolution, this.tolerance);
		
        
		clusterDictionary = {};

		clusterLength = clusterArr.length;
		
		// Now create the cluster markers for the clusters qCluster returned
		for(i = clusterLength - 1; i >= 0; i--){
			
			// Test to see if this cluster is in the defined rendering extent
			if(module.Utils.withinBounds(clusterArr[i].cX, clusterArr[i].cY, webMercMapBounds, resolution)) {
				
				// Add this cluster to an object, with a key that matches a css class name that will be added to the leaflet map marker
				clusterDictionary['cId_' + clusterArr[i].id] = clusterArr[i];
				
				points = clusterArr[i].points;
				
				// Number of points in each cluster
				cnt = points.length;
				
				// Create custom HTML inside of each leaflet marker div
				divHtml = '<div><span>' + cnt +'</span></div>';
				
				// create the class name(s) for the leaflet marker div; the layer id added as the first additional class
				divClass = this.layerId + ' leaflet-marker-icon q-marker-cluster ' + this.clusterCssClass;
				
				// differeniate class names based on cluster point count; clusters greater than one get a 'cluster id' class that matches a key in clustersDictionary object
				if (cnt === 1) {
					
					divHtml = '<div><div class="q-marker-single-default"><span>' + cnt +'</span></div></div></div>';
					
					divClass = divClass + 'q-marker-cluster-single';
					
					// Color single points by classification color?
					if(this.reportingProperty !== null) {
                        
						// Use color of first reporting id
						classificationIds = points[0][this.reportingProperty].toString().split(',');
							
						if (typeof this.dataDictionary[classificationIds[0]] !== 'undefined') {
	
							divHtml = '<div style="background-color: ' + this.dataDictionary[classificationIds[0]].color 
                                    + '"><div class="q-marker-single-default"><span>' + cnt +'</span></div></div></div>';
						}
					}
							
				}
				else if (cnt < 100){
					
					divClass =  divClass + 'q-marker-cluster-small cId_' + clusterArr[i].id;
					
				} else if (cnt < 2500){
					
					divClass = divClass + 'q-marker-cluster-medium cId_' + clusterArr[i].id;
				} 
				
				else {
					
					divClass = divClass + 'q-marker-cluster-large cId_' + clusterArr[i].id;
				}
				
				// set up the custom leaflet marker icon
				myIcon = L.divIcon({'className':divClass , 'html': divHtml });
				
				// Convert web mercator coordinates to lat/lon as required by leaflet
				var lngLat =  module.Utils.webMercToGeodetic(clusterArr[i].cY, clusterArr[i].cX);
				
				// instaniate the leaflet marker
				clusterMarker = L.marker([lngLat[1], lngLat[0]], {icon:myIcon});
				
				// Deal with cluster click event
				if(this.clickHandler) {
					
					if(this.clickHandler){
						clusterMarker.on('click', this.clickHandler, this);
					}
					
					if(this.idProperty)
						clusterMarker['pointIds'] = [];
					
						for (var j = 0, jMax = cnt; j < jMax; j ++) {
							clusterMarker['pointIds'].push(points[j][this.idProperty]);
						}
					}
				}
				
				// Store it in an array
				clusterMarkers.push(clusterMarker);	
			}
		}
		
		// instaniate a leaflet feature group that contains our clusters
		this.layer = L.featureGroup(clusterMarkers);
		
		this.map.addLayer(this.layer);
		
		// Add layer to map if displayState is true; 
		if(this.layerVisibility){
			
			this.map.addLayer(this.layer);
			
			// Set the z-index of the layer if specified
			
			if(typeof this.mapOrder === 'number'){
				$('.' + this.layerId).css('z-index', this.mapOrder);
			}
						
			switch (this.clusterClassificationChart) {
				
				case 'donut':
					//this.makeDonuts();
					break;
				case 'none':
					break;
				default:
			}	
			
		}
		
		if(this.activeCluster) {
			this.markActiveCluster();
		}
	};

	module.PointClusterer.prototype.mapMove = function(){
		if(!$(this.map._container).is(":visible")) {
			return;
		}
		
		this.map.removeLayer(this.layer);
		
	    this.makeClusters();
	};
	
	return module;
	
}(QCluster || {}));

