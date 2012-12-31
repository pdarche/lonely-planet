var GEO_LOCATION = { 
    watchID: null,
    callback: null            
};

GEO_LOCATION.mySpot = function(position){
    var lat = (position.coords) ? new String(position.coords.latitude) : position.x;
    var lon = (position.coords) ? new String(position.coords.longitude) : position.y;
    return GEO_LOCATION.callback(lat, lon);
}

GEO_LOCATION.getLocation = function(func, timeout){
    GEO_LOCATION.callback = func;
    if (navigator.geolocation) {
        this.requestCurrentPosition(this.mySpot, this.errorCallback, this.timeoutCallback, timeout, {maximumAge:10000, timeout:timeout, enableHighAccuracy:true});
    } else {
        alert('Geolocation feature is not available. Trying to locate your location using alternate methods...');
        setTimeout(this.errorCallback, 3000);
    }
}

GEO_LOCATION.requestCurrentPosition = function(successCB, errorCB, timeoutCB, timeoutThreshold, options){
      var successHandler = successCB;
      var errorHandler = errorCB;

      window.geolocationTimeoutHandler = function(){
        timeoutCB();
      }
      
      if(typeof(geolocationRequestTimeoutHandler) != 'undefined'){
        clearTimeout(window['geolocationRequestTimeoutHandler']);
      }
      
      var timeout = timeoutThreshold || 30000;
      window['geolocationRequestTimeoutHandler'] = setTimeout('geolocationTimeoutHandler()', timeout);//set timeout handler
      
      GEO_LOCATION.watchID = navigator.geolocation.watchPosition( 
            function(position){
                successHandler(position);
                clearTimeout(window['geolocationRequestTimeoutHandler']);
            },
            function(error){
              if(!GEO_LOCATION.room){
                    clearTimeout(window['geolocationRequestTimeoutHandler']);
                    alert("Something went wrong. Trying to locate your position using your IP address instead. Please wait...");
                    setTimeout(errorHandler, 3000);
              }
            },
            options
      );
};

GEO_LOCATION.errorCallback = function(){
    var url = 'http://freegeoip.net/json/?callback=?';
    $.getJSON(url, function(data) {
        if(data){
            var position = {};
            position.x = data.latitude;
            position.y = data.longitude;
            GEO_LOCATION.mySpot(position);
        }
        if(GEO_LOCATION.watchID){
            navigator.geolocation.clearWatch(GEO_LOCATION.watchID);
        }
    });
}

GEO_LOCATION.timeoutCallback = function(){
      var text = "Hi there! we are trying to locate you but you have not answered the security question yet.\n\nPlease choose 'Share My Location' to enable us to find you.";
      // alert(text);                      
}