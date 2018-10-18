// Specify YOUR Mapbox default access token
var accessToken = 'pk.eyJ1IjoiaHFtaHFtIiwiYSI6ImNqbWd2bnUwaDAxdmczcXJya3g0c2dwdWcifQ.IG3SeJgHqrc0QHs0ulyVgg';

// Specify YOUR uploaded Mapbox Studio style URL
var styleURL = 'mapbox://styles/hqmhqm/cjmikxgnki7wb2rp0gcgbiwgw';

// Use GeoViewport and the window size to determine and appropriate center and zoom for the continental US
var continentalView = function(w,h) { return geoViewport.viewport([-128.8, 23.6, -65.4, 50.2], [w, h]); }
var continental = continentalView(window.innerWidth/2, window.innerHeight/2);

//** INTERACTIVE MENU
// Create an object to list all the possible districts for a given state or territory
var stateList = states.map(function(d) { return { name: d.Name, abbr: d.USPS }; });
var possibleDistricts = {};
stateList.map(function(d) { possibleDistricts[d.abbr] = [] });

//** INTERACTIVE MENU
// For each state, add the numbers of its districts
for (d in bboxes) {
    possibleDistricts[d.slice(0,2)].push(d.slice(2,d.length));
}

//** INTERACTIVE MENU
// Sort in ascending order each state's list of districts
for (d in possibleDistricts) {
    possibleDistricts[d].sort(function(a,b) {
				  if (b === "") { return 1 } else { return parseInt(a) - parseInt(b); }
			      });
    // For states with only one district, make the list of districts only contain an at-large choice
    if (possibleDistricts[d].length === 2) { possibleDistricts[d] = ['00']; }
}


var gFocusMap;
var gDistrict;
var gMap;


$( document ).ready(
    function () {
	//** INTERACTIVE MENU
	// Add an option to the interactive State menu for each state
	stateList.map(function(d) {
	    $('#state')
		.append($("<option></option>")
			.attr('value', d.abbr).text(d.name));
	});
	
	//** INTERACTIVE MENU
	// Create an event listener that responds to the selection of a state from the menu
	$('#state').change(function() {
	    if (this.value === '') { window.location.hash = '#' }
	    else {
		var hash = window.location.hash;
		var newHash = 'state=' + this.value;
		window.location.hash = newHash;
	    }
	});

	// set default menu selection to Massachusetts
	$("#state").val("MA");
	
	//** INTERACTIVE MENU
	// Create an event listener that responds to the selection of a district from the menu
	$('#district').change(function() {
	    var hash = window.location.hash;
	    var currentDistrictIndex = hash.indexOf('&district=');
	    var newHash = currentDistrictIndex >= 0 ?
		hash.slice(0,currentDistrictIndex) + '&district=' + this.value :
		hash + '&district=' + this.value ;
	    window.location.hash = newHash;
	});
	
	// Checks for support of Mapbox GL. Works with most modern browsers.
	if (mapboxgl.supported({ failIfMajorPerformanceCaveat: true })) {
	    
	    // Initialize the map
	    mapboxgl.accessToken = accessToken;
	    var map = new mapboxgl.Map({
		container: 'map',
		style: styleURL,
		center: continental.center,
		zoom: continental.zoom
	    });

	    gMap = map;


	    
	    // Once map is fully loaded...
	    map.on('load', function() {
		
		// Retrieve the JSON styling object for the map
		var baseStyle = map.getStyle()
		
		// Add zoom and rotation controls to the map
		map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
		
		// Disable using touch gestures for map rotation
		map.touchZoomRotate.disableRotation();
		

		// Given a state postal abbreviation and a US Census district number, focus the map on that area
		function focusMap(stateAbbr, districtCode) {
		    //** INTERACTIVE MENU
		    // Set the interactive menu to focus on the state and district code, if provided
		    $('#state').val(stateAbbr);
		    $('#district').empty();
		    if (possibleDistricts[stateAbbr]) {
			possibleDistricts[stateAbbr].map(function(d) {
			    $('#district')
				.append($("<option></option>")
					.attr('value', d).text(d));
			});
			if (districtCode) $('#district').val(districtCode);
			
			// For each district color layer in the map, apply some filters...
			for (var i = 1; i <= 5; i++) {
			    
			    // The filter that filters based on color is the one we want to preserve
			    // If there are already multiple filters applied, it will be the last one
			    var exisitingFilter = map.getFilter('districts_' + i);
			    if (exisitingFilter[0] === 'all') {
				exisitingFilter = exisitingFilter[exisitingFilter.length - 1];
			    }
			    
			    // Create a fresh filter to be applied
			    var filter = ['all'];
			    
			    // Add filters for the focus state and district number
			    if (stateAbbr) filter.push(['==', 'state', stateAbbr]);
			    if (districtCode) filter.push(['==', 'number', districtCode]);
			    
			    // Add the existing color filter
			    var layerFilter = filter.concat([exisitingFilter]);
			    
			    // Set new layer filter for each district layer in the map
			    map.setFilter('districts_' + i, layerFilter);
			    map.setFilter('districts_' + i + '_boundary', layerFilter);
			    map.setFilter('districts_' + i + '_label', layerFilter);
			    
			}
			
			// Create a generic filter for the focus state and district number that does not include color filtering
			var boundaryFilter = ['all'];
			if (stateAbbr) boundaryFilter.push(['==', 'state', stateAbbr]);
			if (districtCode) boundaryFilter.push(['==', 'number', districtCode]);
			
			// Apply the generic filter to the boundary lines
			map.setFilter('districts_boundary_line', boundaryFilter);
			
			// Determine current window height and width and whether the bbox should focus on a single district
			var height = window.innerHeight,
			    width = window.innerWidth,
			    districtAbbr = districtCode ? districtCode : '';
			
			// Determine the best center and zoom level for the new map focus and then go there
			var view = geoViewport.viewport(bboxes[stateAbbr + districtAbbr], [width/2, height/2]);
			map.jumpTo(view);
		    }
		}

		console.log('setting gFocusMap to ', focusMap);
		gFocusMap = focusMap;

		geolocate();


		// Check the URL hash to determine how the map should be focused
		function checkHash() {
		    // If a URL hash is found...
		    if(window.location.hash) {
			
			// Grab the URL hash
			var hash = window.location.hash;
			
			// Split up the hash string into its components
			var hashData = hash.substring(1).split('&').map(function(d) { return d.split('=') });
			
			// Determine state or district based on the hash data
			var state, district;
			hashData.map(function(d) {
			    if (d[0] === 'state') state = d[1];
			    if (d[0] === 'district') district = d[1];
			})
			
			// If a state or state and district were found in the URL hash, focus the map to this location
			if (state || (state && district)) {
			    focusMap(state, district);
			}
			
		    } else {
			// If there is no URL hash...
			// And if its not the first time the page is loading...
			if (!initial) {
			    
			    // Reset the map style to its original style object and jump back to the continental view
			    map.setStyle(baseStyle);
			    map.jumpTo(continentalView(window.innerWidth/2, window.innerHeight/2));
			    
			    //** INTERACTIVE MENU
			    // Empty the list of districts because no state is selected
			    $('#district').empty();
			}
		    }
		}
		
		// When the URL hash changes, call the checkHash function
		window.onhashchange = checkHash;
		
		// Record that it initial page load and the hash still needs to be checked
		var initial = true;
		checkHash();
		
		// Record that it is no longer the initial page load
		initial = false;

                function browseDistrict(e) {
		    var district = null;
		    
		    // The map control provides a client-side-only way to determine what
		    // is under the cursor. We restrict the query to only the layers that
		    // provide congressional district polygons. Note that this only scans
		    // features that are currently shown on the map. So if you've filtered
		    // the districts so only a state or a single district is showing, this
		    // will restrict the query to those districts.
		    var features = map.queryRenderedFeatures(
			e.point,
			{
			    layers: ["districts_1", "districts_2", "districts_3", "districts_4", "districts_5"]
			});
		    if (features.length > 0) {
			// The feature properties come from the original GeoJSON uploaded to Mapbox.
			district = features[0].properties;
			gDistrict = district;

			var state = abbrevToStateName(district.state);
			var data = lookupRatioByDistrict(state, district.number);
			// district: ${district.state} ${district.number}<br> 
			var stuff = `<table border=0><tr><th colspan=2>${abbrevToStateName(district.state)} district ${district.number}<tr><td align=left>Voting Population:<td align=left>${numberWithCommas(data.population)}<tr><td align=left>Voted Last Election:<td align=left>${numberWithCommas(data.voted)}<tr><td align=left>One Vote Has Power of:<td align=left style="font-size:14px"><b>${data.ratio.toPrecision(2)} voters</b></table>`;
			console.log(stuff);
			console.log(e);
			$('#legend').html(stuff);
			$('#legend').show();
			$('#legend').css('z-index', 20);
			$('#legend').css('left', e.point.x);
			$('#legend').css('top',  e.point.y);

		    } 
		    }

		// A click handler that shows what was under the cursor where
		// the user clicked.
		map.on("click", function(e) {
			   browseDistrict(e);
		});

		
	    });

	} else {
	    
	    // If Mapbox GL is not supported
	    // Log this information to the console (perhaps an alert that the website is not fully featured would be better?)
	    console.log('Mapbox GL not supported');
	    
	    // Initialize the map
	    L.mapbox.accessToken = accessToken;
	    var map = L.mapbox.map('map').setView(continental.center, continental.zoom);
	    L.mapbox.styleLayer(styleURL).addTo(map);
	    
	    // Redefine the focusMap function from above
	    function focusMap(stateAbbr, districtCode) {
		console.log("redefining focusMap for Mapbox GL not supported case");
		var height = window.innerHeight,
		    width = window.innerWidth,
		    districtAbbr = districtCode ? districtCode : '';
		
		var view = geoViewport.viewport(bboxes[stateAbbr + districtAbbr], [width/2, height/2]);
		map.setView([view.center[1], view.center[0]], view.zoom + 1);
		
	    }
	    
	    // Redefine the checkHash function from above
	    function checkHash() {
		if(window.location.hash) {
		    var hash = window.location.hash;
		    var hashData = hash.substring(1).split('&').map(function(d) { return d.split('=') });
		    
		    var state, district;
		    hashData.map(function(d) {
			if (d[0] === 'state') state = d[1];
			if (d[0] === 'district') district = d[1];
		    })
		    
		    if (state || (state && district)) focusMap(state, district);
		}
	    }
	    
	    // Create an event listener for changes in the URL hash
	    window.onhashchange = checkHash;
	    checkHash();
	    
	}
    });



const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
