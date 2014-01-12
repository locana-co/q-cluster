$(document).ready(function(){
	
	var map = L.map('map').setView([38.5, -97], 5);
            
    map.addLayer(L.tileLayer('http://{s}.tiles.mapbox.com/v3/643gwozdz.h00dfolo/{z}/{x}/{y}.png', {}));
           
	
	
});