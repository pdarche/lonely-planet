var app = app || {};

var PlanetView = Backbone.View.extend({
  initialize: function(){
    var self = this;
    // NOTE: review to see which of these are used!
    this.pins = [];
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
    this.tilt = 0.41;
    this.cloudsScale = 1.005;
    this.theta = 45;
    this.clock = new THREE.Clock();
    this.followerCount = 10000;
    this.VIEW_ANGLE = 45;
    this.ASPECT = this.WIDTH / this.HEIGHT;
    this.NEAR = 0.1;
    this.FAR = 10000;
    this.position = {x: 0, y: 0, z: 1200};
    this.target = {x: 0, y: 200, z: 250};
    this.tween = new TWEEN.Tween(this.position)
                            .to(this.target, 8000);
    this.mousedown = false;
    this.mouseX = 0;
    this.mouseY = 0;

    _.bindAll(this, 'setupScene', 'setupGlowScene',
      'setupRenderer', 'setupTextures', 'setupShaders',
      'setupPrimarySceneElements', 'configureGlowScene',
      'setupFilmEffect', 'setupProjector', 'setupTween',
      'addLights', 'addStars', 'addControls', 'loop',
      'render', 'resize', 'onMouseMove', 'onMouseDown',
      'onMouseUp', 'newTweet', 'rotateScene', 'uAreHere'
    )

    // setup the scene
    this.setupScene();
    this.setupGlowScene();
    this.setupRenderer();
    this.setupTextures();
    this.setupShaders()
    this.setupPrimarySceneElements();
    this.configureGlowScene();
    this.setupFilmEffect();
    this.setupProjector();
    // get the user's location
    GEO_LOCATION.getLocation(this.uAreHere, 12000);
    // setup the camera tween
    this.setupTween();
    // add the scene elements and start rendering
    this.addLights();
    this.addStars();
    this.addControls();
    this.loop();

    //bind resize, mousemove events
    $(window).resize(this.resize);
    $(document).mousemove(this.onMouseMove);
    $(document).mousedown(this.onMouseDown);
    $(document).mouseup(this.onMouseUp);

    // bind new tweet event to the collection
    this.collection.bind('add', this.newTweet);

  },

  render: function() {
    var delta = this.clock.getDelta();

    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
    // glowcomposer.render(0.1);
    // finalcomposer.render(0.1);
    this.renderer.clear();
    this.composer.render(delta);
  },

  onMouseMove: function(ev){
    ev.preventDefault();

    if (!this.mouseDown) {
        return;
    }

    var deltaX = ev.clientX - this.mouseX
      , deltaY = ev.clientY - this.mouseY;

    this.mouseX = ev.clientX;
    this.mouseY = ev.clientY;
    this.rotateScene(deltaX, deltaY);
  },

  onMouseDown: function(ev) {
    ev.preventDefault();

    this.mouseDown = true;
    this.mouseX = ev.clientX;
    this.mouseY = ev.clientY;
  },

  onMouseUp: function(ev) {
    ev.preventDefault();

    this.mouseDown = false;
  },

  rotateScene: function(deltaX, deltaY){
    this.group.rotation.y += deltaX / 100;
    this.group.rotation.x += deltaY / 100;
  },

  loop: function() {
    var self = this;

    this.group.rotation.y += (0.02).degreesToRadians();
    this.clouds.rotation.y += (0.01).degreesToRadians();

    TWEEN.update();

    if (this.pins.length > 0) {
      $.each(this.pins, function(i){
        if (self.pins[i].dead){
          // this.pins[i].children[0].children[1].visible = false;
          // scene.remove(scene.__objects[i + 2]);
          // delete pins[i].children[0].children[1];
          // renderer.deallocateObject(pins[i].children[0].children[1]);
        } else {
          self.pins[i].fadeMarker();
          self.pins[i].fadeIndicator();
          self.pins[i].spike();
        }
      });
    }

    requestAnimationFrame(this.loop);
    this.render();
    this.controls.update();
  },

  uAreHere: function(x, y){
    var userPin = this.dropPin(Number(x), Number(y), 0xFFFFFF)
      , lat = (90 - Number(x)).degreesToRadians()
      , lon = (90 + Number(y)).degreesToRadians();

    this.group.add(userPin);
  },

  updateTween: function(){
    this.tween.onUpdate(function(){
      this.camera.position.z = this.position.z
      this.camera.position.y = this.position.y
    });
  },

  newTweet: function(ev){
    var tweet = this.collection.last()
      , lat = tweet.get('lp_geo').geometry.location.lat
      , lng = tweet.get('lp_geo').geometry.location.lng
      , pin = this.dropPin(lat, lng, 0xFFFFFF, tweet);

    if (tweet.get('user').followers_count <= this.followerCount){
      this.group.add(pin);
      this.pins.unshift(pin);
    }
  },

  setupTween: function(){
    var self = this;

    this.tween.onUpdate(function(){
      self.camera.position.z = self.position.z;
      self.camera.position.y = self.position.y;
    });
    this.tween.delay(1000);
    this.tween.easing(TWEEN.Easing.Quadratic.InOut);
    this.tween.start();
  },

  setupScene: function() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
                      this.VIEW_ANGLE, this.ASPECT,
                      this.NEAR, this.FAR
                    );
    this.camera.position.set(0, 0, 1200);
    this.camera.lookAt(this.scene.position);
    this.scene.add(this.camera);

  },
  // configure and add the glow scene
  setupGlowScene: function() {
    this.glowscene = new THREE.Scene();
    this.glowcamera = new THREE.PerspectiveCamera(
                          this.VIEW_ANGLE, this.ASPECT,
                          this.NEAR, this.FAR
                        );
    this.glowcamera.position = this.camera.position;
    this.glowscene.add(this.glowcamera);

  },

  setupRenderer: function() {
    // renderer stuff
    this.renderer = new THREE.WebGLRenderer({clearColor: 0x000000, clearAlpha: 1});
    this.renderer.setSize(this.WIDTH, this.HEIGHT);
    this.renderer.sortObjects = false;
    this.renderer.autoClear = false;

    this.$el.append(this.renderer.domElement);

  },

  // NOTE: RENAME!
  setupTextures: function() {
    var base = "static/media/final-images/";

    this.group = new THREE.Object3D();
    this.planetTexture = THREE.ImageUtils.loadTexture(base + "earth_atmos.jpg");
    this.cloudsTexture = THREE.ImageUtils.loadTexture(base + "earth_clouds.png");
    this.normalTexture = THREE.ImageUtils.loadTexture(base + "earth_normal.jpg");
    this.specularTexture = THREE.ImageUtils.loadTexture(base + "earth_specular.jpg");

  },

  setupShaders: function() {
    var shader = THREE.ShaderUtils.lib[ "normal" ]
      , uniforms = THREE.UniformsUtils.clone(shader.uniforms)
      , parameters;

    uniforms[ "tNormal" ].value = this.normalTexture;
    uniforms[ "uNormalScale" ].value.set( 0.85, 0.85 );
    uniforms[ "tDiffuse" ].value = this.planetTexture, this.cloudsTexture;
    uniforms[ "tSpecular" ].value = this.specularTexture;
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

    this.earthRadius = 90;
    earth = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthRadius, 64, 64),
      new THREE.MeshPhongMaterial({
        map: this.planetTexture,  //THREE.ImageUtils.loadTexture( 'static/media/good-earth/small-map.jpg' ),
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

    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthRadius + 2, 32, 32),
      new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map: this.cloudsTexture, //THREE.ImageUtils.loadTexture( 'static/media/good-earth/small-clouds.png' ),
        transparent: true
      })
    );
    this.clouds.position.set(0, 0, 0);
    this.clouds.receiveShadow = true;
    this.clouds.castShadow = true;
    this.group.add(this.clouds);

    this.scene.add(this.group);

  },

  configureGlowScene: function(){
    var atmosphere;

    atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthRadius + 4, 32, 32 ),
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

    this.effectFilm.renderToScreen = true;

    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(this.renderModel);
    this.composer.addPass(this.effectFilm);

  },

  //NOTE: what does this do?
  setupProjector: function() {
    var projector, plane;

    this.projector = new THREE.Projector();
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
    mouse2D = new THREE.Vector3(0, 10000, 0.5);
    ray = new THREE.Ray(this.camera.position, null);

  },

  addLights: function() {
    var ambient, directional

    // add earth ambient light
    ambient = new THREE.AmbientLight(0x111111);
    this.scene.add(ambient);

    // add earth directional light
    directional = new THREE.DirectionalLight(0xDDDDDDD);
    directional.castShadow = true;
    this.scene.add(directional);

    // add glowscene ambient light
    this.glowscene.add(new THREE.AmbientLight(0xffffff));

    // add optional light params
    directional.position.set( 1, 0, 1).normalize();
    directional.target.position.copy(this.scene.position);

  },

  addStars: function() {
    var i, r, starsGeometry, stars, starsMaterials;

    r = 10;
    starsGeometry = [new THREE.Geometry(), new THREE.Geometry()];

    for (i = 0; i < 500; i++) {
      var vertex = new THREE.Vector3();
      vertex.x = Math.random() * 2 - 1;
      vertex.y = Math.random() * 2 - 1;
      vertex.z = Math.random() * 2 - 1;
      vertex.multiplyScalar( r );

      starsGeometry[0].vertices.push(vertex);
    }

    for (i = 0; i < 3000; i++) {
      var vertex = new THREE.Vector3();
      vertex.x = Math.random() * 2 - 1;
      vertex.y = Math.random() * 2 - 1;
      vertex.z = Math.random() * 2 - 1;
      vertex.multiplyScalar(r);

      starsGeometry[ 1 ].vertices.push( vertex );
    }

    starsMaterials = [
      new THREE.ParticleBasicMaterial( { color: 0x555555, size: 2, sizeAttenuation: false } ),
      new THREE.ParticleBasicMaterial( { color: 0x555555, size: 1, sizeAttenuation: false } ),
      new THREE.ParticleBasicMaterial( { color: 0x333333, size: 2, sizeAttenuation: false } ),
      new THREE.ParticleBasicMaterial( { color: 0x3a3a3a, size: 1, sizeAttenuation: false } ),
      new THREE.ParticleBasicMaterial( { color: 0x1a1a1a, size: 2, sizeAttenuation: false } ),
      new THREE.ParticleBasicMaterial( { color: 0x1a1a1a, size: 1, sizeAttenuation: false } )
    ];

    for (i = 10; i < 30; i++) {
      stars = new THREE.ParticleSystem(starsGeometry[i % 2], starsMaterials[i % 6]);

      stars.rotation.x = Math.random() * 6;
      stars.rotation.y = Math.random() * 6;
      stars.rotation.z = Math.random() * 6;

      s = i * 10;
      stars.scale.set(s, s, s);

      stars.matrixAutoUpdate = false;
      stars.updateMatrix();

      this.scene.add(stars);
    }

  },
  //NOTE: figure out which of these are needed
  addControls: function() {
    this.controls = new THREE.TrackballControls(this.camera);

    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;

    this.controls.noZoom = false;
    this.controls.noPan  = false;
    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;
    this.controls.keys = [65, 83, 68];

    this.controls.addEventListener('change', this.render);

  },

  resize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  //NOTE: this will likely
  mouseMove: function(ev) {
    ev.preventDefault();
    mouse2D.x = (ev.clientX / window.innerWidth) * 2 - 1;
    mouse2D.y = -(ev.clientY / window.innerHeight) * 2 + 1;

    mouse3D = this.projector.unprojectVector(mouse2D.clone(), this.camera);
    ray.direction = mouse3D.subSelf(this.camera.position).normalize();

    var intersects = ray.intersectObjects(this.scene.children);

    // mouseover stuff to see if the mose is intersecting a tweet
    if (intersects.length > 0) {
      // if ( ROLLOVERED ) ROLLOVERED.color.setHex( 0x00ff80 );
      ROLLOVERED = intersects;
      // console.log( intersects )
    }
  },

  dropPin: function(latitude, longitude, color, tweet) {
    var group1, group2, marker, markerLength, indicator;

    group1 = new THREE.Object3D();
    group2 = new THREE.Object3D();
    markerLength = 10
    marker = new THREE.Mesh(
      new THREE.CylinderGeometry(.05, .25, 15, false),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent : true,
      })
    );
    indicator = new THREE.Mesh(
      new THREE.CylinderGeometry(.5, .5, 4, 25, false),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent : true,
      })
    );

    indicator.position.y = this.earthRadius
    marker.position.y = this.earthRadius

    // why is group 1 added twice?
    group1.add(indicator);
    group2.add(group1);
    group1.add(marker);
    group1.rotation.x = (90 - latitude).degreesToRadians();
    group2.add(group1);
    group2.rotation.y = (90 + longitude).degreesToRadians();

    group2.tweet = tweet;
    group2.geo = {lat: latitude, lon: longitude};
    group2.dead = false;

    group2.fadeMarker = function(){
      if (this.children[0].children[1].material.opacity > 0){
        this.children[0].children[1].material.opacity -= .01
      } else {
        this.dead = true;
      }
    }

    group2.fadeIndicator = function(){
      if (this.children[0].children[0].material.opacity > .5){
        this.children[0].children[0].material.opacity -= .03
      }
    }

    group2.spike = function(){
      if (this.children[0].children[1].scale.y < 3 && !this.dead) {
        this.children[0].children[1].scale.y += .8
        // console.log(this.children[1].children[1].scale.y)
      }
    }

    return group2
  }

});


function getRandomInRange(from, to, fixed) {
  return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
}
