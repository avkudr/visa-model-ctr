var container;
var cameraExt, scene, renderer,renderer2, controls;
var camera;
var tube, circle;
var randomSpline;
var robot;
var frames;
var windowManager;
var subWindow;

var gui = new dat.GUI();
var FabricationParams = function () {
    this.length1 = 100;
    this.length2 = 160;
    this.length3 = 220;

    this.curvRadius1 = 0.0;
    this.curvRadius2 = 0.027;
    this.curvRadius3 = 0.0;
};

var DOFs = function () {
    this.translation1 = 0;
    this.translation2 = 0;
    this.translation3 = 0;

    this.rotation1 = 0;
    this.rotation2 = 0;
    this.rotation3 = 0;
}

window.onload = function () {
    var pars = new FabricationParams();
    var dofs = new DOFs();
    
    var f1 = gui.addFolder('Fabrication parameters');
    f1.add(pars, 'length1', 50, 250);
    f1.add(pars, 'length2', 50, 250);
    f1.add(pars, 'length3', 50, 250);
    f1.add(pars, 'curvRadius1', 0, 0.05);
    f1.add(pars, 'curvRadius2', 0, 0.05);
    f1.add(pars, 'curvRadius3', 0, 0.05);

    var f2 = gui.addFolder('Joint values');
    f2.add(dofs, 'translation1', 0, 200);
    f2.add(dofs, 'translation2', -200, 200);
    f2.add(dofs, 'translation3', -200, 200);
    f2.add(dofs, 'rotation1', -180, 180);
    f2.add(dofs, 'rotation2', -180, 180);
    f2.add(dofs, 'rotation3', -180, 180);
    f2.open();

    //on changing parameters of the first folder f1
    for (var i in f1.__controllers) {
        f1.__controllers[i].onChange(function(value) {
            updateScene('fabrication', this);
        });
    }
    //on changing parameters of the second folder f2
    for (var i in f2.__controllers) {
        f2.__controllers[i].onChange(function(value) {
            updateScene('dofs', this);
        });
    }

    //button for a new window
    var obj = { add:function(){ 
        subWindow = window.open( '', 'eye-view', 'width=640,height=480,location=no,resizable=no,menubar=no' ); 

        var canv = subWindow.document.getElementById('camera-image');
        if (canv === null){
            subWindow.document.title = "Robot Eye-camera";
            subWindow.document.body.style.margin = 0;

            renderer2 = new THREE.WebGLRenderer({
                preserveDrawingBuffer: true,
                antialias: true
            });
            renderer2.domElement.id = 'camera-image';
            renderer2.setPixelRatio(subWindow.devicePixelRatio);
            renderer2.setSize(640,480);
            renderer2.domElement.style.padding = '0px';
            renderer2.domElement.style.margin = '0px';
            renderer2.domElement.style.overflow = 'hidden';
            renderer2.setClearColor( new THREE.Color(0x111111) );
            subWindow.document.body.appendChild(renderer2.domElement);
        }
    }};
    gui.add(obj,'add').name("Show robot camera view");
};

function updateScene(type, pars) {

    // monitored code goes here  
        
    if (type == 'fabrication'){
        robot.tubes[0].setLength    (pars.object.length1);
        robot.tubes[0].setCurvature(pars.object.curvRadius1);
        robot.tubes[1].setLength    (pars.object.length2);
        robot.tubes[1].setCurvature(pars.object.curvRadius2);
        robot.tubes[2].setLength    (pars.object.length3);
        robot.tubes[2].setCurvature(pars.object.curvRadius3);
    } else {
        var q = new Array(6);
        q[0] = pars.object.rotation1 / 180.0 * Math.PI;
        q[1] = pars.object.rotation2 / 180.0 * Math.PI;
        q[2] = pars.object.rotation3 / 180.0 * Math.PI;
        q[3] = pars.object.translation1 / 1000; // to mm
        q[4] = pars.object.translation2 / 1000;
        q[5] = pars.object.translation3 / 1000;

        robot.setJointPos(q);
    } 

    robot.updateAll();

    updateCameraOnRobot();
    
}

init();
animate();

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
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor( new THREE.Color(0x222222) );
    renderer.setViewport( 0, 0, window.innerWidth,  window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // general configuration of the scene
    scene = new THREE.Scene();
    //scene.background = new THREE.Color(0x222222);

    cameraExt = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    cameraExt.position.set(0, -500, 500);

    controls = new THREE.TrackballControls(cameraExt, renderer.domElement);
    controls.minDistance = 200;
    controls.maxDistance = 1000;
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

    //eye-in-hand
    camera = new THREE.PerspectiveCamera(30, 640 / 480, 1, 250);
    camera.matrixAutoUpdate = false;
    cameraHelper = new THREE.CameraHelper( camera );
    cameraHelper.visible = false;
    scene.add( cameraHelper );

    /*
    var loader = new THREE.STLLoader();
    loader.load( './models/EiffelTower_fixed.stl', function ( geometry ) {
        var material=new THREE.MeshLambertMaterial({ ambient: 0xFBB917,color: 0x3333aa });
        scene.add( new THREE.Mesh( geometry, material ) );
    });
    */

    var geometry = new THREE.PlaneGeometry( 32, 32, 5 );
    var texture = new THREE.TextureLoader().load( '../models/calib_target.png' );
    var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide, map: texture} );
    var calibTarget = new THREE.Mesh( geometry, material );
    calibTarget.rotation.y = Math.PI / 2;
    calibTarget.position.x = 200;
    calibTarget.position.y = 0;
    calibTarget.position.z = 175;
    scene.add( calibTarget );

    /*
    controlTransform = new THREE.TransformControls( cameraExt, renderer.domElement );
    controlTransform.addEventListener( 'change', animate );
    controlTransform.attach( calibTarget );
    scene.add( controlTransform );
    */
    

    robot.updateAll();   
    updateCameraOnRobot();
}

function animate() {
    /*
    setTimeout( function() {
        requestAnimationFrame( animate );
    }, 1000 / 60 );
    */
    requestAnimationFrame( animate );
    controls.update();
    renderer.render(scene, cameraExt); 
    if (renderer2 !== undefined){
        renderer2.setClearColor( new THREE.Color(0) );
        renderer2.render(scene, camera);
    }
}


window.addEventListener("keyup", function(e){
    var imgData, imgNode;
    
    if(e.which === 80){ //Listen to 'P' key
        try {
            imgData = renderer2.domElement.toDataURL();      
        } 
        catch(e) {
            console.log("Browser does not support taking screenshot of 3d context");
            return;
        }
        console.log(imgData);

        var link = document.createElement("a");
    
        link.setAttribute("href", imgData);
        link.setAttribute("download", "vst-screenshot.png");
        link.click();
    }else if (e.which === 65){ // 'a' key
        robot.toggleDisplayFrames();
    }else if (e.which === 67){ // 'c' key
        cameraHelper.visible = ! cameraHelper.visible;
    }
});




















