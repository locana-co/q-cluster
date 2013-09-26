// Use this in conjunction with qCluster.js to create a cluster layer on a Leaflet Map; requires Leaflet JS lib
// the 'makeDonuts' function (not mandatory to use) requires D3 and jQuery
var QClusterLeafletLayer = {};

QClusterLeafletLayer.Manager =  function(pointArr, id, map, opts){
	
	this.layer;
	this.layerId = id;
	this.pointData = pointArr;
	this.map = map;
	this.clusters = {};
	this.useClassificationColors;
	this.activeClusterLatlng = null;
	
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
	this.pointClassifications = options.pointClassifications || null;
	//this.reportingClasses = options.taxClasses.classifications || null;
	this.mapEdgeBuffer = options.mapEdgeBuffer || 100;
	this.clusterTolerance = options.clusterTolerance || 100;
	this.clusterCssClass = options.clusterCssClass || '';
	this.clusterClickHandler = options.clusterClickHandler || null;
	this.hasClusterClick = options.hasClusterClick || true;
	this.hasSingleClick = options.hasSingleClick || false;
	this.clickHandler = options.clickHandler || null;
	this.missingClassificationColor = options.missingClassificationColor || '#000000';
	
	// Do the clustering
	this.clusterPoints();
	
	//  When the map pans or zooms
	this.map.on('moveend', this.mapMove, this);
	
	// When map is clicked, we clear the active marker
	this.map.on('click', function(){
		// Remove the active marker and publish notification
		this.removeActiveCluster(true);
	}, this);
	
	// Listen for removeActiveCluster notifications
	amplify.subscribe('removeActiveCluster', this, function(){
		// Remove the active marker
		this.removeActiveCluster(false);

	});
		
	return this;
};

QClusterLeafletLayer.Manager.prototype.mapMove = function(){
	
	if($(this.map._container).is(":visible")) {
		
		this.map.removeLayer(this.layer);
		
	    this.clusterPoints();
	}
	//
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
	
	if(typeof this.layer !== 'undefined') {
		this.map.removeLayer(this.layer);
	}
	
	// Use qCluster library to cluster points
	clusters = QCluster.makeClusters(this.pointData, this.getResolution(), this.clusterTolerance, this.mapBounds());
	this.clusters = {};
	
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
				classificationIds = points[0].c_ids.toString().split(',');
				
				// Color single points by classification color?
				if(this.useClassificationColors) {
					
					if (typeof this.pointClassifications[classificationIds[0]] !== 'undefined') {

						divHtml = divHtml.replace(this.missingClassificationColor, this.pointClassifications[classificationIds[0]].color);
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
				
				if(this.clickHandler){
					clusterMarker.on('click', this.clickHandler, this);
				}
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
	
	if(this.activeClusterLatlng) {
		this.markActiveCluster();
	}
	//amplify.publish('clusteringFinished');
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
		
		data = {};
		
		points = this.clusters[i].points;
		
		// Loop through the clusters points and summarize the points by counts per unique attribute (stored in the 's' property)
		for (var j = 0, jMax = points.length; j < jMax; j ++) {
			
			clsIdArr = points[j].c_ids.toString().split(',');
			
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
						'color': this.pointClassifications[clsId].color,
						'alias': this.pointClassifications[clsId].alias
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
		bounds,
		resolution;
	
	bounds = this.map.getBounds();
	resolution = this.getResolution();
	
	xmin = L.CRS.EPSG3857.project(bounds._southWest).x - this.mapEdgeBuffer * resolution;
	xmax = L.CRS.EPSG3857.project(bounds._northEast).x + this.mapEdgeBuffer * resolution;
	ymin = L.CRS.EPSG3857.project(bounds._southWest).y - this.mapEdgeBuffer * resolution;
	ymax = L.CRS.EPSG3857.project(bounds._northEast).y + this.mapEdgeBuffer * resolution;
	
	if(x < xmin || x > xmax || y < ymin || y > ymax) {
		return false
	}
	else {
		return true;
	}
	
};

QClusterLeafletLayer.Manager.prototype.mapBounds = function(x, y) {
	var xmin,
		xmax,
		ymin,
		ymax,
		bounds,
		resolution;
	
	bounds = this.map.getBounds();
	resolution = this.getResolution();
	xmin = L.CRS.EPSG3857.project(bounds._southWest).x - this.mapEdgeBuffer * resolution;
	xmax = L.CRS.EPSG3857.project(bounds._northEast).x + this.mapEdgeBuffer * resolution;
	ymin = L.CRS.EPSG3857.project(bounds._southWest).y - this.mapEdgeBuffer * resolution;
	ymax = L.CRS.EPSG3857.project(bounds._northEast).y + this.mapEdgeBuffer * resolution;
	
	return {'xmin': xmin, 'xmax': xmax, 'ymin': ymin, 'ymax': ymax };
	
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

QClusterLeafletLayer.Manager.prototype.markActiveCluster = function() {
	
		// When the user click on a cluster that can be made active (i.e., less than 20 points), the map centers on that cluster
		// Of course, when that happens, the old clusters/layer gets destoyed and remade.  Thus we lose reference to the cluster
		// that we clicked to make active.  However, the lat/lng of the orginally clicked cluster, will be identical to the new
		// cluster that should be made active
		
		// Loop thru all the 'markers' (aka _layers) in the map layer 
		for(var i in this.layer._layers) {
			
			var latlng = this.layer._layers[i]._latlng;
			
			// If this marker's latlng === the clicked cluster latlng, add active-marker class to the divIcon
			if(latlng.lat === this.activeClusterLatlng.lat && latlng.lng === this.activeClusterLatlng.lng ) {
				$(this.layer._layers[i]._icon).toggleClass('active-marker', true);
			}
		}

};

QClusterLeafletLayer.Manager.prototype.removeActiveCluster = function(publishRemovalNotice) {
	
		this.activeClusterLatlng = null;
		
		$('.leaflet-marker-pane .active-marker').toggleClass('active-marker', false);
		
		if(publishRemovalNotice === true){
			// Send a message that the active cluster has been removed
			amplify.publish('activeClusterRemoved');
		}
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
	
	var classificationColorPalette = options.colorPalette || ['#8b722c','#e7dfc7','#040707','#c96228','#80adc0','#a19788','#ddecf2','#9e0000','#03671f','#8e2b5c','#e13066','#5c8276','#efa0cb','#62517b','#2c688b','#56c2a7','#e1df2f','#ed3333','#e69890','#545454'];	
	
	// Loop thru each taxonomy
	_.each(taxClassData, function(taxonomy){
				
		taxColObj = {
			
			'value': taxonomy.value,
		 	'alias': taxonomy.alias,
		 	'active': false,
		 	'classifications' : {},
		 	'classificationArr': []
		};
		
		
		// Loop thru each classification
		_.each(taxonomy.classifications, function(classification, i){
			
			var classificationObj = {
				'value': classification.value,
				'alias': classification.alias, 
				'color': classification.color, 
				'count': 0, 
				'otherSums':{}
			};
			
			if(typeof classification.color === 'undefined' || classification.color === null) {
				if (i > classificationColorPalette.length - 1) {
					
					index = (i % classificationColorPalette.length) - 1;
					classificationObj.color = classificationColorPalette[index];
				}
				else {
					classificationObj.color = classificationColorPalette[i];
				}				
			}
			
			taxColObj.classifications[classification.value] = classificationObj;
			
			taxColObj.classificationArr.push(classificationObj);
		});
		
		keyValues[taxonomy.value] = taxColObj;
		collection.push(taxColObj);
	});
	
	return {'objArray': collection, 'keyValues' : keyValues};
	
};
