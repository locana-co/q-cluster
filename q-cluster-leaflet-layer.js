// Use this in conjunction with qCluster.js to create a cluster layer on a Leaflet Map; require Leaflet JS lib
// the 'makeDonuts' function (not mandatory to use) requires D3 and jQuery
var QClusterLeafletLayer = {};


QClusterLeafletLayer.Manager =  function(pointArr, id, map, opts){
	
	this.layer;
	this.layerId = id;
	this.pointData = pointArr;
	this.map = map;
	this.clusters = {};
	this.useClassificationColors;
	
	var self,
		options,
		clusters,
		cnt,
		divHtml,
		divClass,
		myIcon,
		latlon,
		points,
		clusterMarker,
		classificationId,
		clusterMarkers = [];
	
	self = this;
		
	options = opts || {};
	
	this.useClassificationColors = options.useClassificationColors || false;
	this.clusterClassificationChart = options.clusterClassificationChart || 'none';
	this.taxClasses = options.taxClasses || null;
	this.mapEdgeBuffer = options.mapEdgeBuffer || 0;
	
	this.clusterTolerance = options.clusterTolerance || 100;
	this.clusterCssClass = options.clusterCssClass || '';
	this.clusterClickHandler = options.clusterClickHandler || null;
	this.hasClusterClick = options.hasClusterClick || true;
	this.hasSingleClick = options.hasSingleClick || false;
	this.missingClassificationColor = options.missingClassificationColor || '#000000';
	
	this.clusterPoints();
	
	this.map.on('moveend', function(){ 
			
		self.map.removeLayer(self.layer);
		
		self.clusterPoints();
	});
			
	return this;
};

QClusterLeafletLayer.Manager.prototype.clusterPoints = function() {
	
		var clusters,
		cnt,
		divHtml,
		divClass,
		myIcon,
		latlon,
		points,
		clusterMarker,
		classificationId,
		clusterMarkers = [];
	
	var self = this;
	
	// Use qCluster library to cluster points
	clusters = QCluster.makeClusters(this.pointData, this.getResolution(), this.clusterTolerance);
	
	// Now create the cluster markers for the clusters qCluster returned
	for(var i = 0, iMax = clusters.length; i < iMax; i++) {
		
		// Test to see if this cluster is in the defined rendering extent
		if(this.isInBounds(clusters[i].cX, clusters[i].cY)) {
			
			// Add this cluster to an object, with a key that matches a css class name that will be added to the leaflet map marker
			this.clusters['cId_' + clusters[i].id] = clusters[i];
			
			points = clusters[i].points;
			// Number of points in each cluster
			cnt = points.length;
			
			// Custom HTML inside of each leaflet marker div
			divHtml = '<div><span>' + cnt +'</span></div>';
			
			// create the class name(s) for the leaflet marker div; the layer id added as the first additional class
			divClass = this.layerId + ' leaflet-marker-icon marker-cluster ' + this.clusterCssClass;
			
			// differeniate class names based on cluster point count; clusters greater than one get a 'cluster id' class that matches a key in the this.clusters object
			if (cnt === 1) {
				divHtml = '<div style="background-color: ' + this.missingClassificationColor + '"><div class="marker-single-default"><span>' + cnt +'</span></div></div></div>';
				divClass = divClass + 'marker-cluster-single';
				classificationId = points[0].cl_id;
				
				if(this.useClassificationColors) {
					
					if (typeof this.taxClasses.classifications[classificationId] !== 'undefined') {

						divHtml = divHtml.replace(this.missingClassificationColor, this.taxClasses.classifications[classificationId].color);
					}
				}		
			}
			else if (cnt < 100){
				divClass =  divClass + 'marker-cluster-small cId_' + clusters[i].id;
			} else if (cnt < 1000){
				divClass = divClass + 'marker-cluster-medium cId_' + clusters[i].id;
			} 
			else {
				divClass = divClass + 'marker-cluster-large cId_' + clusters[i].id;
			}
			
			// set up the custom leaflet marker icon
			myIcon = L.divIcon({'className':divClass , 'html': divHtml });
			
			// Convert web mercator coordinates to lat/lon as required by leaflet
			latlon =  this.webMercatorToGeographic(clusters[i].cX, clusters[i].cY);
			
			// instaniate the leaflet marker
			clusterMarker = L.marker(latlon, {icon:myIcon});
			
			// Deal with cluster click event
			if(this.hasClusterClick) {
				
				clusterMarker['l_ids'] = [];
			
				for (var j = 0, jMax = cnt; j < jMax; j ++) {
					clusterMarker['l_ids'].push(points[j].l_id);
				}
				
				clusterMarker.on('click', this.clickHandler, clusterMarker);
			}
			
			// Store it in an array
			clusterMarkers.push(clusterMarker);	
		}
	}
	
	// instaniate a leaflet feature group that contains our clusters
	this.layer = L.featureGroup(clusterMarkers);
	
	// Add layer to map
	this.map.addLayer(this.layer);
		
	switch (this.clusterClassificationChart) {
		
		case 'donut':
			this.makeDonuts();
			break;
		case 'none':
			break;
		default:
	}	
	
	amplify.publish('clusteringFinished');
};

// Add D3 donut charts to leaflet cluster icons
QClusterLeafletLayer.Manager.prototype.makeDonuts = function() {
	
	var points,
		data,
		dataset,
		width,
	    height,
	    radius,
	    wrapper,
	    color,
	    pie,
	    arc,
	    svg,
	    path,
	    clsIdArr,
	    clsId;
		
	// Loop thru the this.clusters object    
	for (var i in this.clusters){
		
		data = {
			
		};
		
		points = this.clusters[i].points;
		
		// Loop through the clusters points and summarize the points by counts per unique attribute (stored in the 's' property)
		for (var j = 0, jMax = points.length; j < jMax; j ++) {
			
			clsIdArr = points[j].cl_id.toString().split(',');
			
			for (var k = 0, kMax = clsIdArr.length; k < kMax; k++) {
					
				clsId = clsIdArr[k];	
			
				if(data.hasOwnProperty(clsId)) {
					data[clsId]['count']++; 
				}
				else if (clsId === ''){
					if(data.hasOwnProperty('-9999')) {
						data['-9999']['count']++; 
					}
					else {
						
						data['-9999'] = {
						'count': 1,
						'color': '#8b8b8b',
						'alias': 'Not assigned'
						};
					}
				}
				else {
					
					data[clsId] = {
						'count': 1,
						'color': this.taxClasses.classifications[clsId].color,
						'alias': this.taxClasses.classifications[clsId].alias
						};
				}

			}
	
		}

		// prep dataset for D3
		dataset = [];
		
		for (var j in data) {
			dataset.push(data[j]);	
		}
		
		// Use jQuery to get this cluster markers height and width (set in the CSS)
		wrapper = $('.' + i);
		width = $(wrapper).width();
		height = $(wrapper).height();
		radius =  Math.min(width, height) / 2;
		
		
		// D3 donut chart boilerplate
		
		pie = d3.layout.pie()
		    	.sort(null);
		
		arc = d3.svg.arc()
		    .innerRadius(radius-radius/4)
		    .outerRadius(radius);
		
		// Note that we add 'clusterDonut' as a selector
		svg = d3.select('.' + i).append("svg")
			.attr("class", "clusterDonut")
		    .attr("width", width)
		    .attr("height", height)
		    //.style('display', 'none')
		    .append("g")
		    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
		
			path = svg.selectAll("path")
					.data(function(){
						    	var dataObjArr,
						    		dataArr,
						    		pieData;
						    		
						    	dataObjArr = dataset;
						    	
						    	dataArr = [];
						    	
						    	for (var i = 0, iMax = dataObjArr.length; i < iMax; i++) {
						    		dataArr.push(dataObjArr[i]['count']);	
						    	}
						    	
						    	pieData = pie(dataArr);
						    	
						    	for (var i = 0, iMax = pieData.length; i < iMax; i++) {
						    		pieData[i].data = dataObjArr[i];	
						    	}
						    	
						    	return pieData;
		    				})
		  				.enter().append("path")
		    			.attr("fill", function(d, j) { 
								    	return d.data.color; 
								    	})
		    			.attr("d", arc);

	}
	

};

QClusterLeafletLayer.Manager.prototype.hideDonuts = function(){
	
	$('.' + this.layerId + ' .clusterDonut').hide();
	
};

QClusterLeafletLayer.Manager.prototype.showDonuts = function(){
	
	$('.' + this.layerId + ' .clusterDonut').show();
	
};

// Check whether an x,y (web mercator is within the buffered extent of the passed Leaflet map)
QClusterLeafletLayer.Manager.prototype.isInBounds = function(x, y) {
	var xmin,
		xmax,
		ymin,
		ymax,
		bounds;
	
	bounds = this.map.getBounds();

	xmin = L.CRS.EPSG3857.project(bounds._southWest).x - this.mapEdgeBuffer;
	xmax = L.CRS.EPSG3857.project(bounds._northEast).x + this.mapEdgeBuffer;
	ymin = L.CRS.EPSG3857.project(bounds._southWest).y - this.mapEdgeBuffer;
	ymax = L.CRS.EPSG3857.project(bounds._northEast).y + this.mapEdgeBuffer;
	
	if(x < xmin || x > xmax || y < ymin || y > ymax) {
		return false
	}
	else {
		return true;
	}
	
};

QClusterLeafletLayer.Manager.prototype.getResolution = function() {
	
	var xmin,
		xmax,
		bounds,
		mapWidth;
				
	bounds = this.map.getBounds();
	mapWidth = this.map.getSize().x;

	xmin = L.CRS.EPSG3857.project(bounds._southWest).x;
	xmax = L.CRS.EPSG3857.project(bounds._northEast).x;
		
	return (xmax - xmin)/mapWidth; // meters/pixel
};

QClusterLeafletLayer.Manager.prototype.webMercatorToGeographic = function(mercatorX, mercatorY) {
	
	var x,
		y,
		lon,
		lat;
	
    if ((Math.abs(mercatorX) > 20037508.3427892) || (Math.abs(mercatorY) > 20037508.3427892)){
        return;
	}
	
    lon = ((mercatorX / 6378137.0) * 57.295779513082323) - (Math.floor( ( (((mercatorX / 6378137.0) * 57.295779513082323) + 180.0) / 360.0)) * 360.0);
    lat = (1.5707963267948966 - (2.0 * Math.atan(Math.exp((-1.0 * mercatorY) / 6378137.0)))) * 57.295779513082323;
	
    return [lat, lon];
};

QClusterLeafletLayer.makeTaxClassifications = function(taxClassData, opts) {
	
	var taxColObj,
		color,
		options,
		index,
		self;
	
	// This will hold the taxonomy-classification objects in array for later use in backbone.js collection
	 var collection = [];
	
	// This will hold the taxonomy-classification objects in an object of key-value pairs
	 var keyValues = {};
	
	
	
	options = opts || {};
	
	var classificationColorPalette = options.colorPalette || ['#1f77b4','#aec7e8','#ff7f0e', '#ffbb78','#2ca02c', 
																'#98df8a', '#d62728', '#ff9896', '#9467bd','#c5b0d5',
																'#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
																'#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5.'];	
	
	// Loop thru each taxonomy
	_.each(taxClassData, function(taxonomy){
				
		taxColObj = {
			
			'id': taxonomy.value,
		 	'alias': taxonomy.alias,
		 	'active': false,
		 	'classifications' : {},
		 	'classificationArr': []
		};
		
		
		// Loop thru each classification
		_.each(taxonomy.childNode, function(classification, i){
			
			if (i > classificationColorPalette.length - 1) {
				
				index = (i % classificationColorPalette.length) - 1;
				color = classificationColorPalette[index];
			}
			else {
				color = classificationColorPalette[i];
			}
			
			
			taxColObj.classifications[classification.value] = {
				'id': classification.value,
				'alias': classification.alias, 
				'color': color, 
				'count': 0, 
				'otherSums':{}
				};
			
			taxColObj.classificationArr.push({
				'id': classification.value,
				'alias': classification.alias, 
				'color': color, 
				'count': 0, 
				'otherSums':{}
				});
		});
		
		keyValues[taxonomy.value] = taxColObj;
		collection.push(taxColObj);
	});
	
	return {'collection': collection, 'keyValues' : keyValues};
	
};
