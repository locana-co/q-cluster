$(document).ready(function(){
	
	var map = L.map('map').setView([38.5, -97], 5);
            
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
		newArr = [];
		var start = Date.now();
		for(var i = dLength - 1; i >= 0; i--) {
			newArr.push({lat: data[i].lat, lng: data[i].lng, georef: Qluster.Utils.geodeticToGeoRef(data[i].lat, data[i].lng,4)});
		}
		var end = Date.now();
		
		newArr.sort(sortGeoRef);
		console.log(end - start);
	},
	error: function(jqXHR, textStatus, errorThrown){
		
	}
});
	
});