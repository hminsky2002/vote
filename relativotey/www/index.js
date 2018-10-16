$(document).ready(function(){
    $("#display-data").hide();
    $("#loading-screen").show();
    $("#state").keypress(function( event ) {
        if ( event.which == 13 ) {
            lookupStateFromInput();
        }
    });

    $("#state").change(function( event ) {
        lookupStateFromInput();
    });
    
    $("#userAddress").keypress(function( event ) {
        if ( event.which == 13 ) {
            lookupStateFromInput();
        }
    });
});

var MAN_WIDTH=89
var map;
var pos, addr, geocoder;
var electionData = null;

// Enables manual district selection screen.
function changeToManualScreen() {
    $("#load-data-auto").hide();
    $("#display-data").hide();
    $("#loading-screen").hide();
    $("#load-data-manual").show();
}

// Look up state by full name name, return its abbreviation
function stateNameToAbbrev(statename) {
    var abbrev = null;
    stateList.forEach(function (d) { 
        if (d.name.toLowerCase() == statename.toLowerCase()) {
        abbrev = d.abbr;
        }
    });
    return abbrev;
}

// Takes state abbrev, returns full name
function abbrevToStateName(abbrev) {
    var fullname = null;
    stateList.forEach(function (d) { 
        if (d.abbr.toLowerCase() == abbrev.toLowerCase()) {
        fullname = d.name;
        }
    });
    return fullname;
}

// returns "city, state-abbrev", e.g., "Brookline, MA"
function getAddressWithState() {
    var city = $('#userAddress').val();
    var state = $("#state").val();
    if (city == "") {
        return abbrevToStateName(state);
    } else {
        return  [city, abbrevToStateName(state)].join(",");
    }
}

// return ratio of voters to eligible population in district
function lookupRatioByDistrict(state, district) {
    var ratio = null;
    // match state and district
    for (var index in by_district) {
	var entry = by_district[index];
	if (entry.state == state && entry.district == district) {
	    ratio = entry.population / entry.voted;
	    break;
	}
    }

    // If we didn't have per-district info, back off to using per-state info
    if (ratio == null) {
	for (var index in turnoutByState) {
	    var entry = turnoutByState[index];
	    if (entry.State == state) {
		ratio = entry.Voting_Eligible_Population_VEP / entry.Total_Ballots_Counted;
		break;
	    }
	}
    }

    return ratio;

}


// look up by state in the turnout.js dataset
function lookupByState(stateName) {
    var result = null;
    // match state 
    for (var index in turnoutByState) {
	var entry = turnoutByState[index];
	if (entry.State == stateName) {
	    result = entry;
	}
    }
    return result;
}

// Adds "st/nd/rd/th" suffix to district number
function addSuffixToDistrict(district) {
    const districtAsString = district.toString();
    const lastDigitOfString = districtAsString.charAt(districtAsString.length-1);
    if (lastDigitOfString === "1") {
        return districtAsString.concat("st");
    }
    else if (lastDigitOfString === "2") {
        return districtAsString.concat("nd");
    }
    else if (lastDigitOfString === "3") {
        return districtAsString.concat("rd");
    }
    else {
        return districtAsString.concat("th");
    }
}

// Takes a state abbreviated name (e.g., "MA")
// Looks up voter stats with our 'voterinfo' endpoint, and displays using 'little man' bar graph
function showVoterInfo(stateAbbrev, district) {
    $("#load-data-auto").hide();
    $("#load-data-manual").hide();
    $("#loading-screen").hide();

    // Make this string safe to pass in URL
    var encodedState = encodeURI(abbrevToStateName(stateAbbrev));
    // TODO url is hardcoded for development. Remove "https://www.relativotey.org/" in production.
    var state = abbrevToStateName(stateAbbrev);

    $("#display-data").show();
    $("#bottom-container").show();

    // Look up election data from 'database', we will make this an SQL query when we have a real db
    //var electionData = edb[state.toLowerCase()];

    var ratio = lookupRatioByDistrict(state, district);

    var caption = "";
    
    if (ratio != null) {
        $( "#men" ).animate({
            width: MAN_WIDTH * ratio,
        }, 1000, function() {
            // Animation complete.
        });

        $("#men").show();

        const districtWithSuffix = addSuffixToDistrict(district);

        if (ratio >= 2) {
            caption = `Based on data from the 2014 congressional election, by voting in the ${districtWithSuffix} congressional district of ${state}, you'd have represented <b><i>${ratio.toPrecision(3)}</i></b> members of your district with your voice.`;
        } else {
            caption = `Based on data from the 2014 congressional election, by voting in the ${districtWithSuffix} congressional district of ${state}, you'd have represented <b><i>${ratio.toPrecision(3)*100}%</i></b> members of your district with your voice.`
        }
    }  else {
        // No election data, either no state was entered or there's no data for it
        if (state == "") {
            caption = `Please enter a state name`;
        } else {
            caption = `Sorry we don't have complete election data on your state, ${state}, for any recent congressional election`;
        } 
    }
        

   $("#caption").html(caption)
}

function browseDisticts() {
	    window.location.href = "browse.html";
}


function initMap() {
    geocoder = new google.maps.Geocoder;
    $("#lbutton").click( (event) => {
        lookupStateFromInput(event);
    });
    $("#locator").click(geolocate);
    
}

/**
Grab the STATE from input text field, and look up using geocoder, display on map
 */
function lookupStateFromInput(event) {
    event.preventDefault();
    $("#load-data-manual").hide();
    $("#loading-screen").show();
    var state = $("#state").val();
    console.log("user entered location "+state);

    // This call used to be for display of location on Google Maps map API
    // geocodeAddress(state,geocoder,map);

    addressToDistrictInfo(getAddressWithState(), showDistrictOnMap);

}

/** Display city's location on map, using city name from input field */
function locate() {
    var state = $("#state").val();
    if (state === undefined) {
        $("#caption").html("Please enter a state name");	
    } else {
        lookupStateFromInput();
    }
}

// Parses out the results from a Google geolocation call, to get the (full) state name
function getStateNameFromResults(results) {
    var statename = null;

    for (index in results) {
        var entry = results[index];
        var component = entry.address_components;
        for (index2 in component) {
        var addr = component[index2];
        console.log("checking addr = ", addr, addr.long_name, addr.types);
        var long_name = addr.long_name;
        var types = addr.types;
        if (types.includes("administrative_area_level_1")){
            statename = long_name;
            break;
        }
        }
    }
    return statename;
}

function geolocateSuccess(position) {
    pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    //infoWindow.setPosition(pos);

    // convert lat,lon to address
    geocoder.geocode({'location': pos}, function(results, status) {
        if (status === 'OK') {
        if (results[0]) {
            /* map.setZoom(6);
        var marker = new google.maps.Marker({
        position: pos,
        map: map
        });
            */
            addr = results;
            //var geozip = a1.formatted_address.match(/,\s\w{2}\s(\d{5})/)[1];
            //console.log("geozip = "+geozip);
            //$("#zip").val(geozip);
            fullStateName = getStateNameFromResults(addr)
            stateAbbrev = stateNameToAbbrev(fullStateName);
            console.log("geolocate: state=",fullStateName);
            $("#state").val(stateAbbrev);

            // grab full street level address, can be used to find congressional district
            var streetAddr = results[0].formatted_address;
            $("#userAddress").val(streetAddr);

            addressToDistrictInfo(getAddressWithState(), showDistrictOnMap);

            //infoWindow.setContent(results[0].formatted_address);
            //infoWindow.open(map, marker);
        } else {
            window.alert('No results found');
        }
        } else {
        window.alert('Geocoder failed due to: ' + status);
        }

        //map.setCenter(pos);
    }, function() {
        handleLocationError(true, map.getCenter());
    });
}

function geolocateFailure(err) {
    $("#load-data-auto").hide();
    $("#display-data").hide();
    $("#loading-screen").hide();
    $("#bottom-container").hide();
    $("#load-data-manual").show();
}

// Try to find user's location from their browser location API (probably uses IP address)
function geolocate() {
    $("#load-data-auto").hide();
    $("#load-data-manual").hide();
    $("#display-data").hide();
    $("#bottom-container").hide();
    $("#loading-screen").show();

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geolocateSuccess, geolocateFailure)
    } else {
        // Browser doesn't support Geolocation
        //handleLocationError(false, infoWindow, map.getCenter());
        $("#loading-screen").hide();
        $("#load-data-manual").show();
        }
    }


    function geocodeAddress(address, geocoder, resultsMap) {
    geocoder.geocode({'address': address}, function(results, status) {
        if (status === 'OK') {
        addr = results;
        /*		     resultsMap.setCenter(results[0].geometry.location);
        var marker = new google.maps.Marker({
        map: resultsMap,
        position: results[0].geometry.location
        });
        */
        } else {
        alert('Geocode was not successful for the following reason: ' + status);
        }
    });
    }

    function handleLocationError(browserHasGeolocation, pos) {
    console.log("geo location error", pos);
}



/**
 * Build and execute request to look up voter info for provided address.
 * @param {string} address Address for which to fetch voter info.
 * @param {function(Object)} callback Function which takes the
 *     response object as a parameter.
 */
function addressToDistrictInfo(address, callback) {
    /**
     * Election ID for which to fetch voter info.
     * @type {number}
     */
    var electionId = 2000;

    /**
     * Request object for given parameters.
     * @type {gapi.client.HttpRequest}
     */
    console.log(`addressToDistrictInfo address=${address}`);

    var req = gapi.client.request({
        
        
        'path' : '/civicinfo/v2/representatives',
        'params' : {'address': address}
    });
    req.execute(callback);
}


/**
Used as the callback from Google civics API

Result of looking up an address yields voting district and state
 */
function showDistrictOnMap(response, rawResponse) {
    var el = document.getElementById('results');
    if (!response || response.error) {
        el.appendChild(document.createTextNode(
        'Error while trying to fetch polling place'));
        return;
    }
    results = response;

    var state = results.normalizedInput.state;
    console.log(results);
    console.log('/civicinfo/v2/representatives lookup,  state=', state);
    var district = null;
    for (var key in response.divisions) {
        var data = response[key];
        m = key.match(/\/cd:(\d+)$/);
        if (m != null) {
        district = m[1];
        break;
        }
    }
    var districtCode = null;
    if (district != "" && district != null) {
        districtCode = zeroPad(district, 2);
    }
    console.log(`district=${district}, districtCode=${districtCode}`);

    // Shows MapBox district boundary map for this state/district
    gFocusMap(state, districtCode);
    showVoterInfo(state, parseInt(district));

}


function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

/**
 * Initialize the API client and make a request.
 */
function googleAPICallback() {
    gapi.client.setApiKey('AIzaSyCzPmoqSuBu_wgzwuRauq0V0LQYtY919Ik');
}
