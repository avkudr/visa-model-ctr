var cameraViewContainer = document.createElement('div');
var scene, cameraExt, rendererExt;
var trackballControls;
var camera, renderer;
var robot;
var modelObj;

// =============================================================================
// GUI SETUP
// =============================================================================

var onControlPanelChange = function(pars) {
    let statusOK;
    let q = ctrlPanel.getJointValues();
    
    // try to set new joint values
    statusOK = robot.setJointPos(q);
    if (!statusOK) { // could't set: probably joint limits
        q = robot.getJointPos();
        pars.object.translation1 = q[3] * 1000;
        pars.object.translation2 = q[4] * 1000;
        pars.object.translation3 = q[5] * 1000;
    }

    robot.updateAll();
    updateCameraOnRobot();
}

var ctrlPanel; 

// =============================================================================
// MAIN PART
// =============================================================================

// TODO: revise this function -> too weird
function updateCameraOnRobot(){
    var mat = new THREE.Matrix4;
    mat.copy(robot.getToolTransform());
    var position = new THREE.Vector3;
    position.setFromMatrixPosition(mat);
    position.multiplyScalar(1000);
    mat.setPosition(position);
    var rot = new THREE.Matrix4;
    rot.makeRotationX(Math.PI);
    mat.multiply(rot);
    rot.makeRotationZ(Math.PI / 2);
    mat.multiply(rot);
    camera.matrix.copy(mat);
    camera.updateMatrixWorld( true );
}

function init() {

    // add main renderer window
    rendererExt = new THREE.WebGLRenderer({alpha: true, antialias: true });
    rendererExt.setPixelRatio(window.devicePixelRatio);
    rendererExt.setSize(window.innerWidth, window.innerHeight);
    rendererExt.setClearColor( new THREE.Color(0x444444) );
    rendererExt.setViewport( 0, 0, window.innerWidth, window.innerHeight);
    document.body.appendChild(rendererExt.domElement);

    // configure small window with camera view
    cameraViewContainer.id = 'ext-view-canvas';
    cameraViewContainer.style.position = 'absolute';
    cameraViewContainer.style.margin = '0';
    cameraViewContainer.style.left = '10px';
    cameraViewContainer.style.bottom = '10px';
    cameraViewContainer.style.width = '480px'; 
    cameraViewContainer.style.height = '375px'; //image height + 15 px
    cameraViewContainer.style.background = 'transparent';
    cameraViewContainer.innerHTML = '<ol>View of the camera on the robot tip</ol>';
    document.body.appendChild(cameraViewContainer);

    ctrlPanel = new ControlPanel(document.body, cameraViewContainer.id, onControlPanelChange);
    // general configuration of the scene
    scene = new THREE.Scene();

    // add external camera
    cameraExt = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    cameraExt.position.set(400, -70, 241);
    cameraExt.up.set( 0, 0, 1 );
    
    trackballControls = new THREE.TrackballControls(cameraExt, rendererExt.domElement);
    trackballControls.minDistance = 200;
    trackballControls.maxDistance = 1000;

    scene.add(new THREE.AmbientLight(0xffffff));
    var light = new THREE.PointLight(0xffffff);
    light.position.copy(cameraExt.position);
    scene.add(light);

    // add robot 
    robot = new ConcentricTubeRobot();
    scene.add(robot.mesh);

    // background grid
    var helper = new THREE.GridHelper(120, 20);
    helper.rotation.x = Math.PI / 2;
    scene.add(helper);

    // tool-camera
    camera = new THREE.PerspectiveCamera(30, 320 / 240, 1, 250);
    camera.matrixAutoUpdate = false;
    cameraHelper = new THREE.CameraHelper( camera );
    cameraHelper.visible = false;
    scene.add( cameraHelper );

    // model
    
    /*
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath( './models/ctr/models/' );
    console.log(mtlLoader.path);
    mtlLoader.load( 'tinker.mtl', function( materials ) {
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials( materials );
        objLoader.setPath( './models/ctr/models/' );
        objLoader.load( 'tinker.obj', function ( object ) {       
            modelObj = object.clone();
            modelObj.rotation.y = -Math.PI * 4 / 4; 
            modelObj.position.x = 80;
            modelObj.position.y = -10;
            modelObj.position.z = 70;
            modelObj.scale.set(70,70,70);
            modelObj.visible = false;
            scene.add( modelObj );
        });
    });
    */
    
    // Create calibration target
    var geometry = new THREE.CubeGeometry( 32, 32, 3 );
    var texture = new THREE.TextureLoader().load( './models/calib_target2.png' );
    var femtoLogo = new THREE.TextureLoader().load( './models/femto_logo.png' );

    var cubeMaterials = [ 
        new THREE.MeshBasicMaterial({color:0xBBBBBB}),
        new THREE.MeshBasicMaterial({color:0xBBBBBB}), 
        new THREE.MeshBasicMaterial({color:0xBBBBBB}),
        new THREE.MeshBasicMaterial({color:0xBBBBBB}), 
        new THREE.MeshBasicMaterial({color:0xFFFFFF, map: femtoLogo}), 
        new THREE.MeshBasicMaterial({color:0xFFFFFF, map: texture}), 
    ]; 

    var calibTarget = new THREE.Mesh( geometry, cubeMaterials );
    calibTarget.rotation.y = Math.PI / 2;
    calibTarget.position.x = 200;
    calibTarget.position.y = 0;
    calibTarget.position.z = 175;
    scene.add( calibTarget );


    robot.updateAll();   
    updateCameraOnRobot();  

    renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: true
    });
    renderer.domElement.id = 'camera-image';
    renderer.setPixelRatio(cameraViewContainer.devicePixelRatio);
    renderer.setSize(480,360);
    renderer.domElement.style.padding = '0px';
    renderer.domElement.style.margin = '0px';
    renderer.domElement.style.overflow = 'hidden';
    renderer.setClearColor( new THREE.Color(0x222222) );
    cameraViewContainer.appendChild(renderer.domElement);
}

function disposeNode (node)
{
    if (node instanceof THREE.Mesh)
    {
        if (node.geometry)
        {
            node.geometry.dispose ();
        }

        if (node.material)
        {
            if (node.material instanceof THREE.MeshFaceMaterial)
            {
                $.each (node.material.materials, function (idx, mtrl)
                {
                    if (mtrl.map)           mtrl.map.dispose ();
                    if (mtrl.lightMap)      mtrl.lightMap.dispose ();
                    if (mtrl.bumpMap)       mtrl.bumpMap.dispose ();
                    if (mtrl.normalMap)     mtrl.normalMap.dispose ();
                    if (mtrl.specularMap)   mtrl.specularMap.dispose ();
                    if (mtrl.envMap)        mtrl.envMap.dispose ();

                    mtrl.dispose ();    // disposes any programs associated with the material
                });
            }
            else
            {
                if (node.material.map)          node.material.map.dispose ();
                if (node.material.lightMap)     node.material.lightMap.dispose ();
                if (node.material.bumpMap)      node.material.bumpMap.dispose ();
                if (node.material.normalMap)    node.material.normalMap.dispose ();
                if (node.material.specularMap)  node.material.specularMap.dispose ();
                if (node.material.envMap)       node.material.envMap.dispose ();

                node.material.dispose ();   // disposes any programs associated with the material
            }
        }
    }
}   // disposeNode

function disposeHierarchy (node, callback)
{
    for (var i = node.children.length - 1; i >= 0; i--)
    {
        var child = node.children[i];
        disposeHierarchy (child, callback);
        callback (child);
    }
}

function animate() {
    requestAnimationFrame( animate ); //loop animation
    
    scene.remove(robot.mesh);
    disposeHierarchy(robot.mesh,disposeNode);
    robot.updateAll();
    scene.add(robot.mesh);
    
    ctrlPanel.setJointValues(robot.getJointPos());
    ctrlPanel.updateDisplay();
    trackballControls.update();
    rendererExt.render(scene, cameraExt); 
      
    updateCameraOnRobot();
    renderer.render(scene, camera);
}

init();
animate();


// =============================================================================
// KEYBOARD CONTROLS
// =============================================================================

window.addEventListener("keyup", function(e){
    var imgData, imgNode;
    
    if(e.which === 80){ //Listen to 'P' key
        //sendImageUDP();
        //saveImage('vst-screenshot');
    }else if (e.which === 65){ // 'a' key - show axis
        robot.toggleDisplayFrames();
    }else if (e.which === 67){ // 'c' key - show camera frustrum
        cameraHelper.visible = ! cameraHelper.visible;
    }else if (e.which === 84){ // 't' key - show 3D object
        modelObj.visible = ! modelObj.visible;
    }
});

// =============================================================================
// RESIZE EVENT
// =============================================================================

window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){
    cameraExt.aspect = window.innerWidth / window.innerHeight;
    cameraExt.updateProjectionMatrix();

    rendererExt.setSize( window.innerWidth, window.innerHeight );
}
