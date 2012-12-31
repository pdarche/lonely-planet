



//  Now that we've included jQuery we can use its syntax for determining if
//  the full HTML page has been loaded. Waiting for the document to be ready
//  helps us avoid strange errors--because if our document is ready that means
//  all of our JavaScript libraries should have properly loaded too!

$( document ).ready( function(){
	

	//  During our last class I spoke about what these functions are doing. 
	//  Have another look at them on your own to jog your memory.

	setupThree()
	addLights()


	//  This template includes mouse controls. 
	//  Make sure that once you load this file in your browser that the browser 
	//  window is in focus. (Just click anywhere on the loaded page.)
	//  Hold down 'A' and move your mouse around to rotate around the scene.
	//  Hold down 'S' and move your mouse up or down to zoom.
	//  Hold down 'D' and move your mouse around to pan.

	addControls()


	//  In our index.html file we’re loading up the Google Maps API libarary.
	//  This next command will setup a Google Maps Geocoder so that later on
	//  we can try to find latitude / longitude coordinates for named places.

	//  Notice how we're not declaring a new variable, but attaching it to
	//  the global "window" object. If we didn't this poor variable would be
	//  limited to this function's scope only--we'd never be able to access
	//  it elsewhere!

	// window.geocoder = new google.maps.Geocoder()


	//  Let’s get ready to read in tweets from Twitter.
	//  Read more on Twitter’s API page:
	//  https://dev.twitter.com/docs/api/1

	//  WARNING: With this API you are only allowed 150 requests per hour!!
	//  This is tracked by IP address, so be wary of testing on NYU’s network.
	//  You can check your rate limit status at anytime by pinging this
	//  address, most easily done by just visiting it in your browser:
	//  https://api.twitter.com/1/account/rate_limit_status.json
	
	//  Note that here I’ve disarmed you. I’ve set the tweetApiArmed to false
	//  which means you won’t fetch real tweets, but instead pull from your
	//  database.js file. This is one way to test without possibly exceeding
	//  your API rate limit. And it means you have to actually read these
	//  comments in order to get your homework functioning ;)

	window.tweets        = []
	window.tweetsIndex   = -1
	window.timePerTweet  = (3).seconds()
	window.tweetApiArmed = false


	//  Let's create a group to collect our objects together in.
	//  This idea of grouping is going to replace the idea of 
	//  pushMatrix() and popMatrix() that you might be familiar with
	//  from Processing: 
	//  We pack everything into a containing group and when we move or
	//  rotate the group all of the group members follow along.

	window.earthGroup = new THREE.Object3D()


	//  Now for Earth. We're going to create a Sphere with a specific radius.
	//  The other two params are for segmentsWidth and segmentsHeight.
	//  The higher those values, the higher resolution (smoother) the curves
	//  of your sphere will be. Play with the values and see for yourself.
	//  The other thing to note is that we're going to texture the sphere
	//  with an image. The textures used in this demo come from a VERY
	//  useful resource: http://www.celestiamotherlode.net/catalog/earth.php

	//  Now that you know where to get Earth textures, is this texture really
	//  the best for this assignment? (As beautiful as the Earth is.)
	//  Would political borders make more sense? Something else?

	window.earthRadius = 90
	window.earth = new THREE.Mesh(
		new THREE.SphereGeometry( earthRadius, 32, 32 ),
		new THREE.MeshLambertMaterial({ 
			map: THREE.ImageUtils.loadTexture( 'media/earthTexture.png' )
		})
	)
	earth.position.set( 0, 0, 0 )
	earth.receiveShadow = true
	earth.castShadow = true
	earthGroup.add( earth )


	//  But what's Earth without a few clouds? Note here how we handle 
	//  transparency (so you can see through the gaps in the clouds down to
	//  Earth's surface) and how we use blending modes to make it happen.
	//  Check out this really useful resource for understanding the blending
	//  modes available in Three.js:
	//	http://mrdoob.github.com/three.js/examples/webgl_materials_blending_custom.html

	window.clouds = new THREE.Mesh(
		new THREE.SphereGeometry( earthRadius + 2, 32, 32 ),
		new THREE.MeshLambertMaterial({ 
			map: THREE.ImageUtils.loadTexture( 'media/cloudsTexture.png' ),
			transparent: true,
			blending: THREE.CustomBlending,
			blendSrc: THREE.SrcAlphaFactor,
			blendDst: THREE.SrcColorFactor,
			blendEquation: THREE.AddEquation
		})
	)
	clouds.position.set( 0, 0, 0 )
	clouds.receiveShadow = true
	clouds.castShadow = true
	earthGroup.add( clouds )


	//  Working with latitude and longitude can be tricky at first
	//  because it feels like X and Y have been swapped
	//  and you also have to remember South and West are negative!
	//  Here are the boundaries of the coordinate system:

	//  Latitude	North +90	South -90
	//  Longitude	West -180	East +180

	//  And if you're itching to read more about sphere mapping:
	//  http://en.wikipedia.org/wiki/Longitude
	//  http://en.wikipedia.org/wiki/Latitude

	/*
	earthGroup.add( dropPin(//  Red is the North Pole -----------------------------
	
		90,
		 0,
		0xFF0000
	))

	earthGroup.add( dropPin(//  Green is the South Pole --------------------------- 

		-90, 
		  0, 
		0x00FF00
	))

	earthGroup.add( dropPin(//  Purple is the fictional Island of Null ------------

		0, 
		0, 
		0xFF00FF
	))

	earthGroup.add( dropPin(//  Yellow is New York City ---------------------------

		 42.3482, 
		-75.1890, 
		 0xFFFF00
	))

	earthGroup.add( dropPin(//  Blue is Paris -------------------------------------

		48.8742, 
		 2.3470, 
		0x00CCFF
	))
	*/


	//  Finally, we add our group of objects to the Scene.

	scene.add( earthGroup )


	//  But also, did you want to start out looking at a different part of
	//  the Earth?

	earthGroup.rotation.y = ( -40 ).degreesToRadians()
	earthGroup.rotation.z = (  23 ).degreesToRadians()


	//  Let's get our loop() on. 
	//  We only need to call loop() once and from there it will call itself.
	//  See inside the loop() function for more details.

	loop()
	
	
	//  And hey, we should be tweeting.
	//  Is your Twitter API armed? Or are you just going to pull canned 
	//  tweets from your database.js file? (Not a bad things to do when you
	//  are in the middle of debugging!)
		
	if( tweetApiArmed ) fetchTweets()
	else {
		
		console.log( 'You are not fetching actually tweets, but loading canned tweets from your database.js file.' )
		console.log( 'To change this find the "tweetApiArmed" variable in application.js and set it to true.' )
		importTweets()
	}
	nextTweet()
})




function fetchTweets(){


	//  Here we’re going to use jQuery ($) to make an Ajax call to the simple
	//  version of Twitter’s API. Why the simple version? Because the simple
	//  version doesn’t require you to setup authorization, etc.
	//  Beware, this API version is deprecated so enjoy it while it lasts!

	//  Read more on Twitter’s API page:
	//  https://dev.twitter.com/docs/api/1

	//  WARNING: With this API you are only allowed 150 requests per hour!!
	//  This is tracked by IP address, so be wary of testing on NYU’s network.
	//  You can check your rate limit status at anytime by pinging this
	//  address, most easily done by just visiting it in your browser:
	//  https://api.twitter.com/1/account/rate_limit_status.json

	console.log( '\n\nFetching fresh tweets from Twitter.' )
	$.ajax({

		url: 'http://search.twitter.com/search.json?geocode=0,0,6400km',


		//  We have to use the datatype 'JSONp' (JavaScript Object Notation with
		//  Padding) in order to safely fetch data that’s not coming from our own
		//  domain name. (Basically, side-stepping a browser security issue.)

		dataType: 'jsonp',
		success: function( data ){

			console.log( 'Received the following data from Twitter:' )
			console.log( data )


			//  If you check the console we’ve just ouput the Twitter data,
			//  and the tweets themselves are stored in the data.results[]
			//  array which we will loop through now:

			data.results.forEach( function( tweet, i ){
				
				console.log( '\nInspecting tweet #'+ (i+1) +' of '+ data.results.length +'.' )
				if( tweet.geo && 
					tweet.geo.coordinates && 
					tweet.geo.coordinates.type === 'Point' ){
					
					console.log( 'YES! Twitter had the latitude and longitude:' )
					console.log( tweet.geo )
					tweets.push({

						latitude:  tweet.geo.coordinates[ 0 ],
						longitude: tweet.geo.coordinates[ 1 ]
					})
				}
				else if( tweet.location ){
					
					console.log( 'Ok. Only found a location name, will try Google Maps for:' )
					console.log( tweet.location )
					setTimeout( function(){
						locateWithGoogleMaps( tweet.location )
					}, i * timePerTweet.divide(2).round() )
				}
				else if( tweet.iso_language_code ){
					
					console.log( 'Not good: Resorting to the ISO language code as last hope:' )
					console.log( tweet.iso_language_code )
					setTimeout( function(){
						locateWithGoogleMaps( tweet.iso_language_code )
					}, i * timePerTweet.divide(2).round() )
				}
				else {

					console.log( 'Sad face. We couldn’t find any useful data in this tweet.' )
				}
			})
		},
		error: function(){

			console.log( 'Oops. Something went wrong requesting data from Twitter.' )
		}
	})
}




function locateWithGoogleMaps( text ){	


	//  We also need to be wary of exceeding Google’s rate limiting.
	//  But Google seems to be much more forgiving than Twitter.
	//  If you want to be a good citizen you should sign up for a free 
	//  API key and include that key in your HTML file. How? See here:
	//  https://developers.google.com/maps/documentation/javascript/tutorial

	//  For more on the geocoding service that we’re using see here:
	//  https://developers.google.com/maps/documentation/javascript/geocoding
	
	geocoder.geocode( { 'address': text }, function( results, status ){

		if( status == google.maps.GeocoderStatus.OK ){

			console.log( '\nGoogle maps found a result for “'+ text +'”:' )
			console.log( results[0].geometry.location )
			tweets.push({

				latitude:  results[0].geometry.location.lat(),
				longitude: results[0].geometry.location.lng()
			})
		} 
		else {

			console.log( '\nNOPE. Even Google cound’t find “'+ text +'.”' )
			console.log( 'Status code: '+ status )
		}
	})
}




function loop(){


	//  Let's rotate the entire group a bit.
	//  Then we'll also rotate the cloudsTexture slightly more on top of that.

	earthGroup.rotation.y  += ( 0.10 ).degreesToRadians()
	clouds.rotation.y += ( 0.05 ).degreesToRadians()


	render()
	controls.update()
	
	
	//  This function will attempt to call loop() at 60 frames per second.
	//  See  this Mozilla developer page for details:
	//  https://developer.mozilla.org/en-US/docs/DOM/window.requestAnimationFrame
	//  And also note that Three.js modifies this function to account for
	//  different browser implementations.
	
	window.requestAnimationFrame( loop )
}




function nextTweet(){
	
	if( tweetsIndex + 1 < tweets.length ){

		tweetsIndex ++

		//  Ideas for you crazy kids to spruce up your homework:
		//  1. Only shine the sun on the part of Earth that is actually
		//     currently experience daylight!
		//  2. Rotate the globe to face the tweet you’re plotting.
		//  3. Don’t just place the pin, but animate its appearance;
		//     maybe it grows out of the Earth?
		//  4. Display the contents of the tweet. I know, I know. We haven’t
		//     even talked about text in Three.js yet. That’s why you’d get
		//     über bragging rights.

		earthGroup.add( dropPin(

			tweets[ tweetsIndex ].latitude,
			tweets[ tweetsIndex ].longitude,
			0xFFFF00
		))
		

		//  I’m trying to be very mindful of Twitter’s rate limiting.
		//  Let’s only try fetching more tweets only when we’ve exhausted our
		//  tweets[] array supply.
		//  But leave this commented out when testing!
		
		//if( tweetsIndex === tweets.length - 1 ) fetchTweets()
	}	
	setTimeout( nextTweet, timePerTweet )
}




function exportTweets(){


	//  Another way to be mindful of rate limiting is to PLAN AHEAD.
	//  Why not save out this data you’ve already acquired?
	//  This will dump your tweet data into the console for you
	//  so you can copy + paste it into your /scripts/database.js file.

	var data = 'database = database.concat(['
	tweets.forEach( function( tweet, i ){

		data += '\n	{'
		data += '\n		latitude:  '+ tweet.latitude +','
		data += '\n		longitude: '+ tweet.longitude
		data += '\n	}'
		if( i < tweets.length - 1 ) data += ','
	})
	data += '\n])'
	console.log( data )
}




function importTweets(){

	//  Did you save any tweets to your /scripts/database.js file?
	//  If so, you can add those right in!

	tweets = tweets.concat( database )
}




function dropPin( latitude, longitude, color ){


	//  Nesting rotations correctly is an exercise in patience.
	//  Imagine that our marker is standing straight, from the South Pole up to
	//  the North Pole. We then move it higher on the Y-axis so that it peeks
	//  out of the North Pole. Then we need one container for rotating on latitude
	//  and another for rotating on longitude. Otherwise we'd just be rotating our
	//  marker shape rather than rotating it relative to the Earth.

	var 
	group1 = new THREE.Object3D(),
	group2 = new THREE.Object3D(),
	markerLength = 36,
	marker = new THREE.Mesh(
		new THREE.CubeGeometry( 1, markerLength, 1 ),
		new THREE.MeshBasicMaterial({ 
			color: color
		})
	)
	marker.position.y = earthRadius

	group1.add( marker )
	group1.rotation.x = ( 90 - latitude  ).degreesToRadians()

	group2.add( group1 )
	group2.rotation.y = ( 90 + longitude ).degreesToRadians()

	return group2
}




//  Why separate this simple line of code from the loop() function?
//  So that our controls can also call it separately.

function render(){

	renderer.render( scene, camera )
}




//  I'll leave this in for the moment for reference, but it seems to be
//  having some issues ...

function surfacePlot( params ){

	params = cascade( params, {} )
	params.latitude  = cascade( params.latitude.degreesToRadians(),  0 )
	params.longitude = cascade( params.longitude.degreesToRadians(), 0 )
	params.center    = cascade( params.center, new THREE.Vector3( 0, 0, 0 ))
	params.radius    = cascade( params.radius, 60 )

	var
	x = params.center.x + params.latitude.cosine() * params.longitude.cosine() * params.radius,
	y = params.center.y + params.latitude.cosine() * params.longitude.sine()   * params.radius,
	z = params.center.z + params.latitude.sine()   * params.radius

	return new THREE.Vector3( x, y, z )
}




function setupThree(){
	
	
	//  First let's create a Scene object.
	//  This is what every other object (like shapes and even lights)
	//  will be attached to.
	//  Notice how our scope is inside this function, setupThree(),
	//  but we attach our new variable to the Window object
	//  in order to make it global and accessible to everyone.

	//  An alterative way to do this is to declare the variables in the 
	//  global scope--which you can see in the example here:
	//  https://github.com/mrdoob/three.js/
	//  But this feels more compact and contained, no?
	
	window.scene = new THREE.Scene()


	//  And now let's create a Camera object to look at our Scene.
	//  In order to do that we need to think about some variable first
	//  that will define the dimensions of our Camera's view.
	
	var
	WIDTH      = 600,
	HEIGHT     = 600,
	VIEW_ANGLE = 45,
	ASPECT     = WIDTH / HEIGHT,
	NEAR       = 0.1,
	FAR        = 10000
	
	window.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR )
	camera.position.set( 0, 0, 300 )
	camera.lookAt( scene.position )
	scene.add( camera )


	//  Finally, create a Renderer to render the Scene we're looking at.
	//  A renderer paints our Scene onto an HTML5 Canvas from the perspective 
	//  of our Camera.
	
	window.renderer = new THREE.WebGLRenderer({ antialias: true })
	//window.renderer = new THREE.CanvasRenderer({ antialias: true })
	renderer.setSize( WIDTH, HEIGHT )
	renderer.shadowMapEnabled = true
	renderer.shadowMapSoft = true


	//  In previous examples I've used the direct JavaScript syntax of
	//  document.getElementById( 'three' ).appendChild( renderer.domElement )
	//  but now that we're using the jQuery library in this example we can
	//  take advantage of it:	

	$( '#three' ).append( renderer.domElement )
}




function addControls(){

	window.controls = new THREE.TrackballControls( camera )

	controls.rotateSpeed = 1.0
	controls.zoomSpeed   = 1.2
	controls.panSpeed    = 0.8

	controls.noZoom = false
	controls.noPan  = false
	controls.staticMoving = true
	controls.dynamicDampingFactor = 0.3
	controls.keys = [ 65, 83, 68 ]//  ASCII values for A, S, and D

	controls.addEventListener( 'change', render )
}




function addLights(){
	
	var
	ambient,
	directional
	
	
	//  Let's create an Ambient light so that even the dark side of the 
	//  earth will be a bit visible. 
	
	ambient = new THREE.AmbientLight( 0x666666 )
	scene.add( ambient )	
	
	
	//  Now let's create a Directional light as our pretend sunshine.
	
	directional = new THREE.DirectionalLight( 0xCCCCCC )
	directional.castShadow = true	
	scene.add( directional )


	//  Those lines above are enough to create another working light.
	//  But we just can't leave well enough alone.
	//  Check out some of these options properties we can play with.

	directional.position.set( 100, 200, 300 )
	directional.target.position.copy( scene.position )
	directional.shadowCameraTop     =  600
	directional.shadowCameraRight   =  600
	directional.shadowCameraBottom  = -600
	directional.shadowCameraLeft    = -600
	directional.shadowCameraNear    =  600
	directional.shadowCameraFar     = -600
	directional.shadowBias          =   -0.0001
	directional.shadowDarkness      =    0.3
	directional.shadowMapWidth      = directional.shadowMapHeight = 2048
	//directional.shadowCameraVisible = true
}



