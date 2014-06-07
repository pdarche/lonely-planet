var Scene = {
  init  : function(){
    Scene.WIDTH  = window.innerWidth,
    Scene.HEIGHT = window.innerHeight

    //scene
    Scene.scene = new THREE.Scene()

    //camera
    Scene.VIEW_ANGLE = 45,
    Scene.ASPECT     = WIDTH / HEIGHT,
    Scene.NEAR       = 0.1,
    Scene.FAR        = 10000

    Scene.camera = new THREE.PerspectiveCamera( Scene.VIEW_ANGLE, Scene.ASPECT, Scene.NEAR, Scene.FAR )
    Scene.camera.position.set( 0, 0, 600 )
    Scene.camera.lookAt( Scene.scene.position )
    Scene.scene.add( Scene.camera )

    //shaders
    Scene.shader = THREE.ShaderUtils.lib[ "normal" ];
    Scene.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

    Scene.uniforms[ "tNormal" ].value = normalTexture;
    Scene.uniforms[ "uNormalScale" ].value.set( 0.85, 0.85 );

    Scene.uniforms[ "tDiffuse" ].value = planetTexture, cloudsTexture;
    Scene.uniforms[ "tSpecular" ].value = specularTexture;

    Scene.uniforms[ "enableAO" ].value = false;
    Scene.uniforms[ "enableDiffuse" ].value = true;
    Scene.uniforms[ "enableSpecular" ].value = true;

    Scene.uniforms[ "uDiffuseColor" ].value.setHex( 0xffffff );
    Scene.uniforms[ "uSpecularColor" ].value.setHex( 0x333333 );
    Scene.uniforms[ "uAmbientColor" ].value.setHex( 0xffffff );

    Scene.uniforms[ "uShininess" ].value = 15;

    Scene.parameters = {

      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: uniforms,
      lights: true,
      fog: true

    };

    Scene.materialNormalMap = new THREE.ShaderMaterial( Scene.parameters );
  },
}