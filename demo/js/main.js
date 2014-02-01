$(document).ready(function(){
	
	var map = L.map('map').setView([38.5, -97], 4);
            
    map.addLayer(L.tileLayer('http://{s}.tiles.mapbox.com/v3/643gwozdz.h00dfolo/{z}/{x}/{y}.png', {}));
           
	$.ajax({
	context: this,
	type: 'GET',
	dataType: "json",
	url: 'data/fires2012.json',
	success: function(data, textStatus, jqXHR){
		
		function sortGeoRef(a, b) {
			if (a.georef < b.georef)
				return -1;
			if (a.georef > b.georef)
				return 1;
			return 0;	
		} 
		
		var dLength = data.length;
		
		pointArr = [];
		
		var lng, lat;
		
		for(var i = dLength - 1; i >= 0; i--) {
			
			lat = data[i].lat;
			lng = data[i].lng;
				
			var webMerc = L.CRS.EPSG3857.project(L.latLng(lat, lng));
			
			pointArr.push({
							lat: lat, 
							lng: lng, 
							georef: QCluster.Utils.geodeticToGeoRef(lng,lat,4),
							x: webMerc.x,
							y: webMerc.y
							});
		}
		
		pointArr.sort(sortGeoRef);
		
		var pointClusterer = new QCluster.PointClusterer(pointArr, 'testLayer', map, {});
		
		
	},
	error: function(jqXHR, textStatus, errorThrown){
		
	}
});
	
});