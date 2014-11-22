var app = app || {};

var PlanetView =  Backbone.View.extend({
  initialize: function(){
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    this.tilt = 0.41;
    cloudsScale = 1.005;

    this.theta = 45;
    this.clock = new THREE.Clock();

    this.showTweet = false;
    this.prepend = true;
    this.tweetIndex = 0;

    this.followerCount = 5000;

    this.VIEW_ANGLE = 45;
    this.ASPECT = this.WIDTH / this.HEIGHT;
    this.NEAR = 0.1;
    this.FAR = 10000;    

  },

  render: function(){

  },

  "events": {
    "window resize": resize,
    "document mousemove": mouseMove
  },

  setupScene: function(){
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
                        this.VIEW_ANGLE, this.ASPECT, 
                        this.NEAR, this.FAR);
    this.camera.position.set(0, 0, 600);
    this.camera.lookAt(this.scene.position);
    this.scene.add(this.camera);
  },

  setupGlowScene: function(){
    // add/configure glow scene
    this.glowscene = new THREE.Scene();
    this.glowcamera = new THREE.PerspectiveCamera(
                            this.VIEW_ANGLE, this.ASPECT, 
                            this.NEAR, this.FAR);
    this.glowcamera.position = this.camera.position;
    this.glowscene.add(this.glowcamera)
  },

  setupRenderer: function(){
    // renderer stuff
    this.renderer = new THREE.WebGLRenderer({clearColor: 0x000000, clearAlpha: 1});
    this.renderer.setSize(this.WIDTH, this.HEIGHT);
    this.renderer.sortObjects = false;
    this.renderer.autoClear = false;

    // NOTE: this is going to change!! This will be the
    // el on the view
    $( '#three' ).append(this.renderer.domElement);
  },

  // NOTE: RENAME!
  setupScene2: function() {
    this.group = new THREE.Object3D()

    this.planetTexture = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_atmos.jpg" );
    this.cloudsTexture = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_clouds.png");
    this.normalTexture = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_normal.jpg" );
    this.specularTexture = THREE.ImageUtils.loadTexture( "static/media/final-images/earth_specular.jpg");
  },

  setupShaders: function() {
    var shader = THREE.ShaderUtils.lib[ "normal" ]
      , uniforms = THREE.UniformsUtils.clone( shader.uniforms )
      , parameters;

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

    parameters = {
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: uniforms,
      lights: true,
      fog: true
    };

    this.materialNormalMap = new THREE.ShaderMaterial(parameters);
  },

  setupPrimarySceneElements: function() {
    var earthRadius, earth, clouds;

    earthRadius = 90;
    earth = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 64, 64),
      new THREE.MeshPhongMaterial({ 
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
    );
    
    earth.position.set(0, 0, 0);
    earth.receiveShadow = true;
    earth.castShadow = true;
    this.group.add(earth);

    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius + 2, 32, 32),
      new THREE.MeshLambertMaterial({ 
        color: 0xffffff,
        map: cloudsTexture, //THREE.ImageUtils.loadTexture( 'static/media/good-earth/small-clouds.png' ),
        transparent: true
      })
    );
    clouds.position.set(0, 0, 0);
    clouds.receiveShadow = true;
    clouds.castShadow = true;
    this.group.add(clouds);

    this.scene.add(this.group);
  },

  configureGlowScene: function(){
    var atmosphere;
    
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
    );
    atmosphere.position.set(0, 0, 0);
    atmosphere.receiveShadow = true;
    atmosphere.castShadow = true;

    this.glowscene.add(atmosphere);
  },

  setupFilmEffect: function(){
    this.renderModel = new THREE.RenderPass(this.scene, this.camera);
    this.effectFilm = new THREE.FilmPass(0.35, 0.75, 2048, false);

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
  },

  setupEffectComposer: function() {
    var renderModel = new THREE.RenderPass(this.scene, this.camera)
      , effectFilm = new THREE.FilmPass(0.35, 0.75, 2048, false);

    effectFilm.renderToScreen = true;

    composer = new THREE.EffectComposer( renderer );
    composer.addPass( renderModel );
    composer.addPass( effectFilm );
  },

  //NOTE: not sure what this does!
  setupProjector: function() {
    var projector, plane;

    projector = new THREE.Projector();
    plane = new THREE.Mesh(
              new THREE.PlaneGeometry(1000, 1000), 
              new THREE.MeshBasicMaterial()
            );
    // plane.rotation.x = - Math.PI / 2;
    plane.rotation.z = - Math.PI / 2;
    plane.position.z = -50
    plane.visible = false;
    this.scene.add(plane);

    //NOTE: what does this do?
    mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
    ray = new THREE.Ray( camera.position, null );    
  }
});