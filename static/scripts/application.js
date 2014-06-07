//spanish,french,bengali,chinese,hindi,korean,russian,swahili,german,turkish,arabic,japanese,portugues
//lonely,solitario,solitaire,একাকী,寂寞,अकेला,고독한,одинокий,upweke,einsam,yalnız,متوحد,寂しい,solitário

  // globals 
  var pins = [], userPin

  var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight

  var camera, 
    scene, 
    glowcamera, 
    glowscene

  var renderer, 
    renderTarget, 
    renderTargetGlow

  // scene objects 
  var group,
    earthRadius,
    earth,
    clouds,
    atmosphere,
    tilt = 0.41;

  var cloudsScale = 1.005;

  // shader vars
  var finalcomposer, 
    glowcomposer, 
    hblur, 
    vblur

  // mouse event vars
  var projector, 
    plane;

  var mouse2D, 
    mouse3D, 
    ray, 
    theta = 45,
    ROLLOVERED

  var clock = new THREE.Clock();

  var showTweet = false,
    prepend = true,
    tweetIndex = 0

  var followerCount = 5000

  // create socket object 
  var ws = new WebSocket("ws://localhost:9000/socket");

  // get user geolocation
    GEO_LOCATION.getLocation(uAreHere, 12000);

  // setup
  init()

  // add lights
  addLights()

  // add controls
  addControls()

  // add stars
  addStars()

  // loop
  loop()

  // add app controls
  addAppControls()

function init(){
  
  var VIEW_ANGLE = 45,
    ASPECT     = WIDTH / HEIGHT,
    NEAR       = 0.1,
    FAR        = 10000


  // add/configure main scene
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR )
  camera.position.set( 0, 0, 600 )
  camera.lookAt( scene.position )
  scene.add( camera )


  // add/configure glow scene
  glowscene = new THREE.Scene()
  glowcamera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
  glowcamera.position = camera.position;
  glowscene.add( glowcamera )

  renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1 } );
  renderer.setSize( WIDTH, HEIGHT );
  renderer.sortObjects = false;

  renderer.autoClear = false;

  $( '#three' ).append( renderer.domElement )

  // create scene
  group = new THREE.Object3D()

  var planetTexture   = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_atmos.jpg" );
  var cloudsTexture   = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_clouds.png");
  var normalTexture   = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_normal.jpg" );
  var specularTexture = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_specular.jpg" );

  //****************** SHADERS *****************

  var shader = THREE.ShaderUtils.lib[ "normal" ];
  var uniforms = THREE.UniformsUtils.clone( shader.uniforms );

  uniforms[ "tNormal" ].value = normalTexture;
  uniforms[ "uNormalScale" ].value.set( 0.85, 0.85 );

  uniforms[ "tDiffuse" ].value = planetTexture, cloudsTexture;
  uniforms[ "tSpecular" ].value = specularTexture;

  uniforms[ "enableAO" ].value = false;
  uniforms[ "enableDiffuse" ].value = true;
  uniforms[ "enableSpecular" ].value = true;

  uniforms[ "uDiffuseColor" ].value.setHex( 0xffffff );
  uniforms[ "uSpecularColor" ].value.setHex( 0x333333 );
  uniforms[ "uAmbientColor" ].value.setHex( 0xffffff );

  uniforms[ "uShininess" ].value = 15;

  var parameters = {

    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: uniforms,
    lights: true,
    fog: true

  };

  var materialNormalMap = new THREE.ShaderMaterial( parameters );

  //****************** PRIMARY SCENE ELEMENTS ******************

  earthRadius = 90
  earth = new THREE.Mesh(
    new THREE.SphereGeometry( earthRadius, 64, 64 ),
    new THREE.MeshPhongMaterial( { 
      map: planetTexture,  //THREE.ImageUtils.loadTexture( 'static/media/good-earth/small-map.jpg' ), 
      transparency: true, 
      opacity: 1, 
      ambient: 0xFFFFFF, 
      color: 0xFFFFFF, 
      specular: 0xFFFFFF, 
      shininess: 5, 
      perPixel: true, 
      metal: true 
    })
  )

  earth.position.set( 0, 0, 0 )
  earth.receiveShadow = true
  earth.castShadow = true
  group.add( earth )

  //  Check out this really useful resource for understanding the blending modes available in Three.js:
  //  http://mrdoob.github.com/three.js/examples/webgl_materials_blending_custom.html

  clouds = new THREE.Mesh(
    new THREE.SphereGeometry( earthRadius + 2, 32, 32 ),
    new THREE.MeshLambertMaterial({ 
      color: 0xffffff,
      map: cloudsTexture, //THREE.ImageUtils.loadTexture( 'static/media/good-earth/small-clouds.png' ),
      transparent: true
    })
  )
  clouds.position.set( 0, 0, 0 )
  clouds.receiveShadow = true
  clouds.castShadow = true
  group.add( clouds ) 

  scene.add( group )

  atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry( earthRadius + 4, 32, 32 ),
    new THREE.MeshPhongMaterial({
      transparency: true, 
      opacity: .1, 
      ambient: 0xFFFFFF, 
      color: 0xFFFFFF, 
      specular: 0xFFFFFF, 
      shininess: 25, 
      perPixel: true
    })

  )
  atmosphere.position.set( 0, 0, 0 )
  atmosphere.receiveShadow = true
  atmosphere.castShadow = true  

  glowscene.add( atmosphere ) 

  var renderModel = new THREE.RenderPass( scene, camera );
  var effectFilm = new THREE.FilmPass( 0.35, 0.75, 2048, false );

  effectFilm.renderToScreen = true;

  composer = new THREE.EffectComposer( renderer );
  composer.addPass( renderModel );
  composer.addPass( effectFilm );

  //projector
  projector = new THREE.Projector();

  plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() );
  // plane.rotation.x = - Math.PI / 2;
  plane.rotation.z = - Math.PI / 2;
  plane.position.z = -50
  plane.visible = false;
  scene.add( plane );

  mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
  ray = new THREE.Ray( camera.position, null );
  

  //***************** EVENTS ***************** 
  //resize
  window.addEventListener( 'resize', onWindowResize, false );

  //mousemove
  document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

//**************** this should be in the UI object

// application control panel  
function addAppControls(){

  //control panel control
  $('#flag').click(function(){
    $('#control_panel').toggleClass("shown", "hidden")
  })

  $('.option').click(function(){
    $('.active').removeClass('active')
    $(this).addClass('active')
    
    if ($('#nav').hasClass('hidden_tweets')){
      $('#nav').removeClass('hidden_tweets').addClass('shown').addClass('active')
    } else{
      $('#nav').removeClass('shown').addClass('hidden_tweets')        
    }
  })

  $('#play, #pause').click(function(){
    console.log('audio control clicked')
    $('.active-audio').removeClass('active-audio')
    $(this).addClass('active-audio')
  })
}

// geolocation callback
function uAreHere(x, y){
  // add user pin
  userPin = dropPin(Number(x), Number(y), 0xFFFFFF )

  group.add(userPin)
  // pins.push( userPin )

  urh = new THREE.Mesh(
      textGeo = new THREE.TextGeometry( "You are here", {

        size: 12,
        height: 2,
        curveSegments: 2,

        font: "helvetiker",
        weight: "normal",
        style: "normal",

        bevelThickness: 2,
        bevelSize: 1.5,
        bevelEnabled: true,

        material: 0,
        extrudeMaterial: 1

      }),
    
    new THREE.MeshBasicMaterial({ 
      color: 0xFF00FF,
      transparent : false,
    })
  )
  scene.add( urh )
}

function onDocumentMouseMove( event ) {

  event.preventDefault();

  mouse2D.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse2D.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  mouse3D = projector.unprojectVector( mouse2D.clone(), camera );
  ray.direction = mouse3D.subSelf( camera.position ).normalize();

  var intersects = ray.intersectObjects( scene.children );

  if ( intersects.length > 0 ) {

    // if ( ROLLOVERED ) ROLLOVERED.color.setHex( 0x00ff80 );

    ROLLOVERED = intersects;
    
    // console.log( intersects )

  }

}

// tweet pins
ws.onmessage = function(event) {
   
  var tweet = JSON.parse(event.data)
  // window.finalLocation = null

  var noBeliebers = /one less lonely girl/i,
        belieber = noBeliebers.test(tweet.text),
        noLinks = /http/i
        links = noLinks.test(tweet.text)
        noAtMentions = /@/g
        atMention = noAtMentions.test(tweet.text)
        split = tweet.text.split(' ')

  if ( belieber === false && split[0] !== 'RT' && links === false && tweet.user.followers_count <= followerCount ){ //tweet.user.followers_count <= 100 &&

      if ( tweet.geo !== null ){

          var lat = tweet.geo.coordinates[0],
        lon = tweet.geo.coordinates[1],
        pin = dropPin(lat, lon, 0xFFFFFF, tweet )


      $.getJSON('http://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',+' + lon + '&sensor=false&callback=?', function(data){

        var finalLocation = data.results[0].formatted_address

        prependTweet(tweet, finalLocation)
        group.add( pin )
        pins.unshift( pin )

      })

      } else if ( tweet.place !== null) {

        var fullname = tweet.place.full_name
            fullname = fullname.split(', ')

        var city = fullname[0],
          state = fullname[1],
          country = tweet.place.country

        $.getJSON('http://maps.googleapis.com/maps/api/geocode/json?' + city + ',+' + state + ',+' + country + '&sensor=false&callback=?', function(data){

            var lat = tweet.geo.coordinates[0],
          lon = tweet.geo.coordinates[1],
          pin = dropPin(lat, lon, 0xFFFFFF, tweet )         

        var finalLocation = data.results[0].formatted_address

        prependTweet(tweet, finalLocation)
          group.add( pin )
          pins.unshift( pin )

        })
      } else if (tweet.user.location !== '' ){

        var location = tweet.user.location
          location = location.replace(',', '+')
          location = location.replace(/\s+/, '+')

        $.getJSON('http://maps.googleapis.com/maps/api/geocode/json?address=' + location + '&sensor=false', function(data){

          if( data.status !== "ZERO_RESULTS"){

              var lat = data.results[0].geometry.location.lat,
                lon = data.results[0].geometry.location.lng,
                pin = dropPin(lat, lon, 0xFFFFFF, tweet )  //CC11

              var finalLocation = data.results[0].formatted_address

              group.add( pin )
              pins.unshift( pin )
              prependTweet(tweet, finalLocation)                  
            }
            
        })
      }

  }

}

function prependTweet(tweet, location){

  if ( tweet.lang !== "en"){
    var toTranslate = encodeURIComponent( tweet.text )
    $.getJSON('https://www.googleapis.com/language/translate/v2?key=AIzaSyB5X7RwczuFOURqZQB7KjIpIVYtLwRzsfk&target=en&q=' + toTranslate, function(data){
      console.log(data.data.translations[0].translatedText)
      var translatedText = data.data.translations[0].translatedText

      attachTweet(tweet, translatedText, location)
    } )
  } else {

    attachTweet(tweet, null, location)

  }

}

function attachTweet(tweet, translatedText, location){

    console.log("translatedText", translatedText)

    if ( translatedText !== null ){

      var tweetText = translatedText  

    } else{

      var tweetText = tweet.text  
    } 

    var tweetString = '<div class="tweet" id="' + tweet.id_str + '"><div class="img"><img src="' + tweet.user.profile_image_url + '"/></div><div class="tweet-wrapper">'
    tweetString += '<div class="user-name"><a href="http://twitter.com/' + tweet.user.screen_name + '" Target="_blank"> ' + tweet.user.name + '</a><span class="location">' + location + '</span>'
    tweetString += '</div><div class="followers">followers: ' + tweet.user.followers_count + '</div><div class="tweet-text"> ' + tweetText + '</div></div>'
    tweetString += '<div class="reply"><textarea cols="40" rows="6" class="reply-input" placeholder="reply to @' + tweet.user.screen_name + ' "></textarea><button class="reply-button">tweet</button></div></div>'                     

    $('#tweets').prepend(tweetString)

    if ( $('#authenticated').html() !== "None") {
      var tweetStr = '#' + tweet.id_str

        $(tweetStr).click(function(){
          $(this).css('width', '655px').delay(450).queue(function(){
            $(this).find('.reply').fadeIn();
            $(this).dequeue() 
          })

          $(this).find('textarea').focus(function(){

            $(this).val( '@' + tweet.user.screen_name )
            var textContent = $(this) 

            $('.reply-button').click(function(){
            var dataString = 'data=' + $(this).prev().val(),
              button = $(this)
            
            $.ajax({
              type: "GET",
              url: "http://127.0.0.1:9000/post",
              data: dataString,
              success: function(data){
                console.log(data)
                button.hide()
                $('textarea').val('Tweet sent!')


              },
              error: function(data){
                console.log(data)
              }
            })
          })
          })    


        })

        $('.tweet').mouseleave(function(){
          $(this).find('.reply').fadeOut().queue(function(){
            $(this).parent().css('width', '300px');
            $(this).dequeue()
          })
        })
    }

    //if there are more than 50 tweets, remove the last one 
      $('.tweet').size() > 50 ? $('.tweet:last-child').remove() : null

      //if user is hovering over tweets stop new tweets from prepending
      $('.tweet').mouseover(function(){
      prepend = false
      controls.enabled = false
      tweetIndex = $('.tweet').index($(this))
      showTweet = true

    }).mouseleave(function(){
      prepend = true
      controls.enabled = true
      showTweet = false
    })

      if( !prepend ){
        $('.tweet').first().hide()
        tweetIndex++
      } else{
        $('.tweet').fadeIn()
        $('.tweet').first().hide().fadeIn()
      }
}

//  Nesting rotations correctly is an exercise in patience.
//  Imagine that our marker is standing straight, from the Sout h Pole up to
//  the North Pole. We then move it higher on the Y-axis so that it peeks
//  out of the North Pole. Then we need one container for rotating on latitude
//  and another for rotating on longitude. Otherwise we'd just be rotating our
//  marker shape rather than rotating it relative to the Earth.

function dropPin( latitude, longitude, color, tweet ){

  var 
  group1 = new THREE.Object3D(),
  group2 = new THREE.Object3D(),
  markerLength = 10,
  marker = new THREE.Mesh(
    new THREE.CylinderGeometry( .05, .25, 15, false ),
    new THREE.MeshBasicMaterial({ 
      color: color,
      transparent : true,
    })
  ),
  indicator = new THREE.Mesh(
    new THREE.CylinderGeometry( .5, .5, 4, 25, false ),
    new THREE.MeshBasicMaterial({ 
      color: color,
      transparent : true,
    })
  )
  indicator.position.y = earthRadius
  marker.position.y = earthRadius

  group1.add( indicator )
  group2.add( group1 )
  group1.add( marker )
  group1.rotation.x = ( 90 - latitude  ).degreesToRadians()
  group2.add( group1 )
  group2.rotation.y = ( 90 + longitude ).degreesToRadians()

  group2.tweet = tweet
  group2.geo = { lat : latitude, lon : longitude }
  group2.dead = false

  group2.fadeMarker = function(){
    if ( this.children[0].children[1].material.opacity > 0 ){
    
      this.children[0].children[1].material.opacity -= .01

    } else {

      this.dead = true 

    }
  }

  group2.fadeIndicator = function(){
    if ( this.children[0].children[0].material.opacity > .5 ){
    
      this.children[0].children[0].material.opacity -= .03

    }
  } 

  group2.spike = function(){
    if ( this.children[0].children[1].scale.y < 3 && !this.dead) {

      this.children[0].children[1].scale.y += .8
      // console.log(this.children[1].children[1].scale.y)

    }

  }

  return group2
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
  
  // add earth ambient light
  ambient = new THREE.AmbientLight( 0x111111 )
  scene.add( ambient )  
  
  // add earth directional light 
  directional = new THREE.DirectionalLight( 0xDDDDDDD )
  directional.castShadow = true 
  scene.add( directional )

  // add glowscene ambient light
  glowscene.add( new THREE.AmbientLight( 0xffffff ) ); 

  // add optional light params
  directional.position.set( -1, 0, 1 ).normalize()
  directional.target.position.copy( scene.position )


  // directional.shadowCameraTop     =  600
  // directional.shadowCameraRight   =  600
  // directional.shadowCameraBottom  = -600
  // directional.shadowCameraLeft    = -600
  // directional.shadowCameraNear    =  300
  // directional.shadowCameraFar     = -600
  // directional.shadowBias          =   -0.0001
  // directional.shadowDarkness      =    0.3
  // directional.shadowMapWidth      = directional.shadowMapHeight = 2048
  //directional.shadowCameraVisible = true
}

function addStars(){

  var i, r = 10, starsGeometry = [ new THREE.Geometry(), new THREE.Geometry() ];

  for ( i = 0; i < 500; i ++ ) {

    var vertex = new THREE.Vector3();
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar( r );

    starsGeometry[ 0 ].vertices.push( vertex );

  }

  for ( i = 0; i < 3000; i ++ ) {

    var vertex = new THREE.Vector3();
    vertex.x = Math.random() * 2 - 1;
    vertex.y = Math.random() * 2 - 1;
    vertex.z = Math.random() * 2 - 1;
    vertex.multiplyScalar( r );

    starsGeometry[ 1 ].vertices.push( vertex );

  }

  var stars;
  var starsMaterials = [
    new THREE.ParticleBasicMaterial( { color: 0x555555, size: 2, sizeAttenuation: false } ),
    new THREE.ParticleBasicMaterial( { color: 0x555555, size: 1, sizeAttenuation: false } ),
    new THREE.ParticleBasicMaterial( { color: 0x333333, size: 2, sizeAttenuation: false } ),
    new THREE.ParticleBasicMaterial( { color: 0x3a3a3a, size: 1, sizeAttenuation: false } ),
    new THREE.ParticleBasicMaterial( { color: 0x1a1a1a, size: 2, sizeAttenuation: false } ),
    new THREE.ParticleBasicMaterial( { color: 0x1a1a1a, size: 1, sizeAttenuation: false } )
  ];

  for ( i = 10; i < 30; i ++ ) {

    stars = new THREE.ParticleSystem( starsGeometry[ i % 2 ], starsMaterials[ i % 6 ] );

    stars.rotation.x = Math.random() * 6;
    stars.rotation.y = Math.random() * 6;
    stars.rotation.z = Math.random() * 6;

    s = i * 10;
    stars.scale.set( s, s, s );

    stars.matrixAutoUpdate = false;
    stars.updateMatrix();

    scene.add( stars );

  }
}

function loop(){

  //  Let's rotate the entire group a bit.
  //  Then we'll also rotate the cloudsTexture slightly more on top of that.

  group.rotation.y  += ( 0.02 ).degreesToRadians()
  clouds.rotation.y += ( 0.01 ).degreesToRadians()

  // camera.position.z > 300 ? camera.position.z -= 1 : null

  if ( camera.position.z > 240 && userPin !== undefined ){
    camera.position.z -= 1
    camera.position.y += .3
    // var cameraXDist = distance(userPin.matrixWorld.getPosition().x*4, camera.position.x)
    // var cameraYDist = distance(userPin.matrixWorld.getPosition().y*4, camera.position.y)
    // var cameraZDist = distance(userPin.matrixWorld.getPosition().z*4, camera.position.z)
    // camera.position.x -= cameraXDist/8
    // camera.position.y -= cameraYDist/8
    // camera.position.z -= cameraZDist/8
  }

  if ( userPin !== undefined ){
    // console.log("geo", userPin.geo.lon)
    // rotationY.makeRotationY(userPin.geo.lon);
    // rotationX.makeRotationX(userPin.geo.lat);
    // translation.makeTranslation(0, 0, earthRadius + 100);
    // matrix.multiply(rotationY, rotationX).multiplySelf(translation);
    // camera.matrix.identity();
    // camera.applyMatrix(matrix);
  }

  if ( pins.length > 0 ) {
    $.each(pins, function(i){
      if ( pins[i].dead ){        
        

        pins[i].children[0].children[1].visible = false
        // scene.remove( scene.__objects[i + 2] )
        // delete pins[i].children[0].children[1]
        // renderer.deallocateObject( pins[i].children[0].children[1] )       

      } else {
        
        pins[i].fadeMarker()
        pins[i].fadeIndicator()
        pins[i].spike()
        
      }

    })
  }

  if ( showTweet ){

    var rolloveredTweet = pins[tweetIndex].children[0].children[1]
      rolloveredTweet.material.opacity = 1
    
    console.log( "opacity", rolloveredTweet.material.opacity )
  }
  
  //  loop() sSee this Mozilla developer page for details:
  //  https://developer.mozilla.org/en-US/docs/DOM/window.requestAnimationFrame
  
  requestAnimationFrame( loop )
  render()
  controls.update()
}

function render(){
  var delta = clock.getDelta();

  camera.lookAt( scene.position )
  renderer.render( scene, camera )
  // glowcomposer.render( 0.1 );
  // finalcomposer.render( 0.1 );

  renderer.clear();
  composer.render( delta );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

  $('#follower_count_slider').slider({
    min: 0,
    max: 1000,
    value:1000,
    slide: function(event, ui){
      
      $('#slider_pos').html(ui.value)
      followerCount = ui.value

      controls.enabled = false
    },
    change: function(event, ui){

      controls.enabled = true

    }
  })


  // add pins
  ws.onmessage();

