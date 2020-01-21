if ( ! Detector.webgl ) {
	Detector.addGetWebGLMessage();
	document.getElementById( 'container' ).innerHTML = "";
}
var container, stats, timeline;
var camera, scene, renderer, controls;
var customDate = new Date();

var waterNormals;
var water;
var addImageNow = null;
var stormSurgesEnabled = false;
var doingTour = false;

var progress = 0;
var venice;

var fileData, tideData;
var dataArray = [];
var tideArray = [];

var plane, mirrorMesh, mirrorMeshComplete, mirrorMeshHole;

var animateTimelineInterval;
var animateTimelineDate;

var parameters = {
	width: 2000,
	height: 2000,
	widthSegments: 250,
	heightSegments: 250,
	depth: 5,
	param: 4,
	filterparam: 1
};

// Create a DataSet of storm events for the timeline
var stormSurges = new vis.DataSet([]);
  
// Configuration for the Timeline
var options = {
	min: new Date(1999,1,01),
	max: new Date(2155,31,12),
	minHeight: '10em',
	width: '100%',
	dataAttributes: 'all',
	showCurrentTime: true,
	start: new Date(customDate.getFullYear(), customDate.getMonth()+1, customDate.getDate()),
	tooltip: {
	  followMouse: true,
	  overflowMethod: 'cap'
	}
};

//Date format conversion
Date.prototype.formatDDMMYYYY = function(){

	return (("0" + this.getDate()).slice(-2) +
	"/" +  ("0" + (this.getMonth() + 1)).slice(-2)) + 
	"/" +  this.getFullYear();
}


function checkBrowserCompatibility(){

    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';

    // Chrome 1+
    var isChrome = !!window.chrome && !!window.chrome.webstore;
	
	if(!isChrome && !isFirefox){
		
		alert("This visualisation runs best on Chrome. Your browser will not display all features.");
	}
	if(isFirefox){
		
		alert("This visualisation runs best on Chrome. Try it out.");
	}
}


window.onload = function() {
	if (window.jQuery) {  
		// jQuery is loaded
		
		//checkBrowserCompatibility();
		
		$('#modDisclaimer').modal('show');
		
		//Read in sea level from data file
		$.get('Data.txt', function(data) {
			fileData = data;
		}, 'text');
		
		//Read in 12h tide cycle data from file
		$.get('SS_Tide.txt', function(data) {
			tideData = data;
		}, 'text');
		 
		$("body").tooltip({ selector: '[data-toggle=tooltip]' });
		
		
		//Load plane with hole to avoid flooding of area that shouldn't be flooded right away
		var loader = new THREE.STLLoader();
		loader.load( './stl/plane.stl', function ( geometry ) {
			plane = geometry;
		});

		var manager = new THREE.LoadingManager();

		//Show percent loaded to user - loading models
		manager.onProgress = function ( item, loaded, total ) {
			var percentComplete = loaded / total * 100;
			console.log( Math.round(percentComplete, 2) + '% downloaded' );
			
			document.querySelector("#percentLoaded").innerHTML = Math.round(percentComplete, 2) + '%';
		};


		//Loading models complete
		manager.onLoad = function ( ) {
			console.log( 'Loading complete!');
			
			setTimeout(function () {
				init();
				animate();
			}, 1000);
			
			setTimeout(function () {
				document.getElementById("loading").style.visibility = "hidden";
				document.querySelector(".uil-ripple").style.visibility = "hidden";
				document.querySelector("#percentLoaded").style.visibility = "hidden";
				//addImageNow();
				
				//Icons for timeline
				var drop = document.createElement("IMG");
				drop.setAttribute("src", "./icons/drop.svg");
				drop.setAttribute("id", "drop");
				document.querySelector(".vis-custom-time").prepend(drop);

				var curDate = document.createElement("IMG");
				curDate.setAttribute("src", "./icons/pin.svg");
				curDate.setAttribute("id", "curDateImg");
				document.querySelector(".vis-current-time").prepend(curDate);


				$(".vis-custom-time").attr({
					"data-toggle" : "tooltip",
					"title" : "Move to Adjust Sea Level Over Time",
					"data-placement" : "top"
				});

				$("#curDateImg").attr({
					"data-toggle" : "tooltip",
					"title" : "Current Date" + new Date(),
					"data-placement" : "right"
				});

				$(".vis-timeline").attr({
					"data-toggle" : "tooltip",
					"title" : "Scroll Timeline to Zoom into Years, Months or Days"
				});

				$("#instrLeft").attr({
					"data-toggle" : "tooltip",
					"title" : "Left Mouse to Tilt",
					"data-placement" : "bottom"
				});

				$("#instrRight").attr({
					"data-toggle" : "tooltip",
					"title" : "Right Mouse to Pan",
					"data-placement" : "bottom"
				});

				$("#instrPan").attr({
					"data-toggle" : "tooltip",
					"title" : "Scroll to Zoom",
					"data-placement" : "bottom"
				});
				
			}, 3000);
			
		};

		var onProgress = function ( xhr ) {
		};

		var onError = function ( xhr ) {
		};

		//Load venice model with textures
		var ObjLoader = new THREE.OBJLoader(manager);

		var MTLLoader = new THREE.MTLLoader(manager);
		MTLLoader.setPath("Venice/");
		MTLLoader.load("Venice.mtl", function ( materials ) {

			materials.preload();

			ObjLoader
				.setMaterials( materials )
				.load( 'Venice/Venice_0.obj', function ( object ) {
					venice = object
					venice.position.set(0, 1, 0);

				});

		});

		
	} else {
		// jQuery is not loaded
		alert("JQuery is not loaded.");
	}
}



function init() {
	container = document.getElementById( 'container' );
	
	//
	renderer = new THREE.WebGLRenderer( { antialias: false } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	
	//renderer.vr.enabled = true;
	//document.body.appendChild( WEBVR.createButton( renderer ) );
	
	
	container.appendChild( renderer.domElement );
	
	//
	scene = new THREE.Scene();
	//fogColor = new THREE.Color(0xbdb4a1);
 
	//scene.background = fogColor;
	//scene.fog = new THREE.Fog(fogColor, 14000, 30000);

	scene.add( venice );
	
	//
	camera = new THREE.PerspectiveCamera( 48, window.innerWidth / window.innerHeight, 500, 35000 );
	camera.position.set( -4342.72, 906, 4382.68 );
	
	
	// Controls
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enablePan = true;
	controls.minDistance = 500;
	controls.maxDistance = 14000.0;
	controls.minZoom = 500;
	controls.maxZoom = 14000.0;
	controls.maxPolarAngle = Math.PI * 0.485;
	controls.target.set( 0, 0, 0 );
	scene.add( new THREE.AmbientLight( 0x444444 ) );
	
	//
	//var light = new THREE.DirectionalLight( 0xffffbb, 0.1);
	var light = new THREE.AmbientLight( 0xffffbb, 0.7);
	light.position.set(1, 1, 1 );
	scene.add( light );
	
	//
	waterNormals = new THREE.TextureLoader().load( 'textures/waternormals.jpg' );
	waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
	water = new THREE.Water( renderer, camera, scene, {
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: waterNormals,
		alpha: 	1.0,
		sunDirection: light.position.clone().normalize(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale: 0,
		fog: scene.fog != undefined
    });
    
	water.mirrorCamera.near = 1;
	
	mirrorMesh= new THREE.Mesh(
		plane,
		water.material
	);
	
	mirrorMesh.scale.set(2.5, 2.5, 2.5);
	mirrorMesh.add( water );
	mirrorMesh.rotation.x = - Math.PI * 0.5;
	
	scene.add( mirrorMesh );
	
	//Change sea level height here
	mirrorMesh.position.set(0, 0.0, 0);
	
	
	
	mirrorMeshComplete = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( parameters.width * 11.97, parameters.height * 11.97),
		water.material
	);
	
	mirrorMeshComplete.add( water );
	mirrorMeshComplete.rotation.x = - Math.PI * 0.5;
	scene.add( mirrorMeshComplete);
	
	//Change sea level height here
	mirrorMeshComplete.position.set(0, 0.0, 0);
	mirrorMeshComplete.visible = false;
	
	// skybox
	var cubeMap = new THREE.CubeTexture( [] );
	cubeMap.format = THREE.RGBFormat;
	var loader = new THREE.ImageLoader();
	loader.load( 'textures/skyboxsun25degtest.png', function ( image ) {
		var getSide = function ( x, y ) {
			var size = 1024;
			var canvas = document.createElement( 'canvas' );
			canvas.width = size;
			canvas.height = size;
			var context = canvas.getContext( '2d' );
			context.drawImage( image, - x * size, - y * size );
			return canvas;
		};
		cubeMap.images[ 0 ] = getSide( 2, 1 ); // px
		cubeMap.images[ 1 ] = getSide( 0, 1 ); // nx
		cubeMap.images[ 2 ] = getSide( 1, 0 ); // py
		cubeMap.images[ 3 ] = getSide( 1, 2 ); // ny
		cubeMap.images[ 4 ] = getSide( 1, 1 ); // pz
		cubeMap.images[ 5 ] = getSide( 3, 1 ); // nz
		cubeMap.needsUpdate = true;
	} );
	
	var cubeShader = THREE.ShaderLib[ 'cube' ];
	cubeShader.uniforms[ 'tCube' ].value = cubeMap;
	
	var skyBoxMaterial = new THREE.ShaderMaterial( {
		fragmentShader: cubeShader.fragmentShader,
		vertexShader: cubeShader.vertexShader,
		uniforms: cubeShader.uniforms,
		depthWrite: false,
		side: THREE.BackSide
	} );
	
	var skyBox = new THREE.Mesh(
		new THREE.BoxGeometry( 100000, 100000, 100000 ),
		skyBoxMaterial
	);
	
	scene.add( skyBox );
	
	//
	stats = new Stats();
	container.appendChild( stats.dom );
	stats.dom.style.visibility = "hidden";
	
	//
	window.addEventListener( 'resize', onWindowResize, false );
	
	var fileContent = fileData.split('\n');
	
	for(var pos = 0; pos < fileContent.length; pos ++){
		var content = fileContent[pos].split(' ');
		dataArray.push([content[0], content[1]]);
	}
	
	var tideFileContent = tideData.split('\n');
	
	for(var pos = 0; pos < tideFileContent.length; pos ++){
		var content = tideFileContent[pos].split(' ');
		tideArray.push([content[0], content[1]]);
	}
	
					
	// Create a Timeline
	timeline = new vis.Timeline(container, stormSurges, options);
	
	// Set custom time bar (movable drop)
	timeline.addCustomTime(customDate, 1);
	
	var timeString = customDate.formatDDMMYYYY();
	
	setTimeStringAtDate(timeString);
	setSeaLevelAtDate(timeString);
	
	// When custom time bar is being moved, update sea level according to new date on timeline
	timeline.on('timechange', function (properties) {
	
		var timeString = properties.time.formatDDMMYYYY();
		setTimeStringAtDate(timeString);
		setSeaLevelAtDate(timeString);
	});
	
	// Set visible window of timeline
	timeline.setWindow('1999-01-01', '2155-12-31');
	
	// When click on timeline, zoom into the window only if the a storm item was clicked (properties.item != null) rather than empty space on timeline
	timeline.on('mouseDown', function (properties) {
		
		if(properties.item != null){
			var id = properties.item;
			
			zoomIntoStorm(id);
		}
		
	});
	
}


function zoomIntoStorm(id){
	
	var date = new Date(stormSurges.get(id).start);
	
	var dateBefore = new Date(date.getTime());
	dateBefore.setDate(date.getDate() - 1);
	
	timeline.setWindow({
		start: dateBefore.setHours(20),
		end:   date.setHours(16),
		animation: {
			duration: 2,
			easingFunction: "easeInQuad"
		}
	});
	
	timeline.setCustomTime(date.setHours(0), 1);
	
	var dateString = '01/01/' + dataArray[id][0].split("/")[2];
	
	setTimeStringAtDate(dateString);
	setSeaLevelAtDate(dateString);
	
	setTimeout(animate(), 500);
}
		
$("#toggleStorms").on( "click", function(event) {
	
	var stormBut = $(this);
	var dateString = timeline.getCustomTime(1).formatDDMMYYYY();
	
	if (stormSurgesEnabled) {
		stormSurgesEnabled = false;
		
		setTimeStringAtDate(dateString);
		setSeaLevelAtDate(dateString);
		
		for(var pos = 0; pos < dataArray.length; pos ++){
			var strVal = dataArray[pos][0].split('/');
			var str = strVal[2] + '-' + strVal[1] + '-' + strVal[0];
			stormSurges.remove({id: pos});
		}
		$("#tideStormContainer").css({ "visibility": "hidden"});
		
		// Set everything to start position
		timeline.setWindow('1999-01-01', '2155-12-31');
		
	} else {
		stormSurgesEnabled = true;
		
		setTimeStringAtDate(dateString);
		setSeaLevelAtDate(dateString);
		
		for(var pos = 0; pos < dataArray.length; pos ++){
			var strVal = dataArray[pos][0].split('/');
			var strStart = strVal[2] + '-' + strVal[1] + '-' + strVal[0] + ' 00:00:00';
			var strEnd = strVal[2] + '-' + strVal[1] + '-' + strVal[0] + ' 12:00:00';
			stormSurges.add({id: pos, content: '<div style="margin-left: 1em;">Storm surge during 12h tide</div><img data-toggle="tooltip" title="Click on storm symbol to zoom in to the storm event" id="storm" src="./icons/stormy.png">', start: strStart, end: strEnd});
		}
		$("#tideStormContainer").css({ "visibility": "visible"});
	}
	
});


$("#info").on( "click", function(event) {
	tour(1);
	
});


function tour(step){
		
	switch(step) {
		case 1:
			//Move drop along timeline
			$('#continueTour').off();
			$('#cancelTour').off();
			
			// Set everything to start position
			timeline.setWindow('1999-01-01', '2155-12-31');
			if(stormSurgesEnabled){
				$('#toggleStorms').click();
			}
			
			var start = new Date(2000,00,01);
			var end = new Date(2155,31,12);
			animateTimelineDate = new Date(start);
			if(!animateTimelineInterval){
				animateTimelineInterval = setInterval(animateTimeline, 300, start, end, 2, 0);
			}
			
			$('#mod').modal('show');
			$('#modTitle').text("Introduction");
			$('#modBody').html("<div>Sea level rise changes according to timeline date.<br><br><img src='./icons/drop.svg' style='width: 1em;'> The drop icon represents the sea level and can be moved along the timeline manually. Data changes every 10 years along the timeline.<br><br><img src='./icons/pin.svg' style='width: 1.5em;'> The pin icon indicates the current date.</div>");
			
			$('#info').addClass('highlight');
			$('.vis-timeline').css('z-index', 3);
			
			$('#continueTour').on( "click", function() {
				$('#info').removeClass('highlight');
				clearInterval(animateTimelineInterval);
				animateTimelineInterval = false;
				tour(2);
			});
			
			$('#cancelTour').on( "click", function() {
				$('#info').removeClass('highlight');
				$('#info').css('z-index', 0);
				$('.vis-timeline').css('z-index', 0);
				clearInterval(animateTimelineInterval);
				animateTimelineInterval = false;
				
				// Set everything to start position
				timeline.setWindow('1999-01-01', '2155-12-31');
				if(stormSurgesEnabled){
					$('#toggleStorms').click();
				}
				return;
			});
			
			break;
		case 2:
			// Highlight pin to show current time
			$('#continueTour').off();
			$('#cancelTour').off();
			
			$('#modTitle').text("Storm Surges and Tidal Cycles");
			$('#modBody').html("<div>Storm surges can be toggled on and off with the Storms button.<br><br><img src='./icons/stormy.png' style='width: 1.5em;'> The storm icons represent storm events. Zoom in by clicking on one of the storm symbols in the timeline.</div>");
			
			$('#toggleStorms').addClass('highlight');
			$('#toggleStorms').css('z-index', 2);
			if(!stormSurgesEnabled){
				$('#toggleStorms').click();
			}
			
			
			$('#continueTour').on( "click", function() {
				tour(3);
			});
			
			$('#cancelTour').on( "click", function() {
				$('#toggleStorms').removeClass('highlight');
				$('#toggleStorms').css('z-index', 0);
				$('.vis-timeline').css('z-index', 0);
				
				// Set everything to start position
				timeline.setWindow('1999-01-01', '2155-12-31');
				if(stormSurgesEnabled){
					$('#toggleStorms').click();
				}
				return;
			});

			break;
		case 3:
			//change text of modal
			$('#continueTour').off();
			$('#cancelTour').off();
			
			$('#modTitle').text("Storm Surges and Tidal Cycles");
			$('#modBody').html("<div>The storm surge is shown over a 12 hour tidal cycle.</div>");
			
			zoomIntoStorm(11);
			//Animate drop along the tidal cycle and storm
			
			var start = new Date(2110,00,01);
			start.setHours(0);
			var end = new Date(2110,00,01);
			end.setHours(12);
			
			animateTimelineDate = new Date(start);
			if(!animateTimelineInterval){
				animateTimelineInterval = setInterval(animateTimeline, 300, start, end, 0, 15);
			}
			
			$('#continueTour').on( "click", function() {
				clearInterval(animateTimelineInterval);
				animateTimelineInterval = false;
				tour(4);
			});
			
			$('#cancelTour').on( "click", function() {
				$('#toggleStorms').removeClass('highlight');
				$('#toggleStorms').css('z-index', 0);
				$('.vis-timeline').css('z-index', 0);
				clearInterval(animateTimelineInterval);
				animateTimelineInterval = false;
				
				// Set everything to start position
				timeline.setWindow('1999-01-01', '2155-12-31');
				if(stormSurgesEnabled){
					$('#toggleStorms').click();
				}
				return;
			});
			
			break;
		case 4:
			$('#continueTour').off();
			$('#cancelTour').off();
		
			$('#modTitle').text("Zooming In and Out of the Timeline");
			$('#modBody').html("<div>There are two options to zoom in and out of the timeline:<br><br><img src='./icons/zoom_in.svg' style='width: 1.5em;'> <img src='./icons/zoom_out.svg' style='width: 1.5em;'> Click the zoom buttons<br><br>OR<br><br><img src='./icons/mouse_scroll.svg' style='width: 1.5em;'> Scroll with the mouse while hovering over the timeline</div>");
			
			$('#zoomIn').css('z-index', 4);
			$('#zoomOut').css('z-index', 4);
			
			var intervFunc = setInterval(zoomOut, 1000);
			
			$('#continueTour').on( "click", function() {
				clearInterval(intervFunc);
				tour(5);
			});
			
			$('#cancelTour').on( "click", function() {
				$('#toggleStorms').removeClass('highlight');
				$('#toggleStorms').css('z-index', 0);
				$('.vis-timeline').css('z-index', 0);
				clearInterval(intervFunc);
				
				// Set everything to start position
				timeline.setWindow('1999-01-01', '2155-12-31');
				if(stormSurgesEnabled){
					$('#toggleStorms').click();
				}
				return;
			});
			
			break;
		case 5:
			//Highlight storm icons
			$('#continueTour').off();
			$('#cancelTour').off();
			$('#continueTour').text("Finish Tour");
			
			$('#modTitle').text("Moving the City Model");
			$('#modBody').html("<div>The city is a 3D model and can be moved to adjust the view.<br><b>The mouse pointer has to be outside the timeline area for this.</b><br><br><img src='./icons/mouse_left.png' style='width: 1.5em;'> Left mouse to tilt.<br><br><img src='./icons/mouse_right.png' style='width: 1.5em;'> Right mouse to pan.<br><br><img src='./icons/mouse_scroll.svg' style='width: 1.5em;'> Scroll to zoom.</div>");
			
			controls.autoRotate = true;
			controls.autoRotateSpeed = 1.0;
			
			$('#continueTour').on( "click", function() {
				$('#cancelTour').click();
				return;
			});
			
			$('#cancelTour').on( "click", function() {
				controls.autoRotate = false;
				$('#toggleStorms').removeClass('highlight');
				$('#toggleStorms').css('z-index', 0);
				$('.vis-timeline').css('z-index', 0);
				
				// Set everything to start position
				timeline.setWindow('1999-01-01', '2155-12-31');
				if(stormSurgesEnabled){
					$('#toggleStorms').click();
				}
				$('#continueTour').text("Continue Tour");
				return;
			});
			
			break;
	}
	
}


function animateTimeline(start, end, stepYear, stepHours) {
	
	if(animateTimelineDate.getFullYear() >= end.getFullYear() && animateTimelineDate.getHours() >= end.getHours()){
		animateTimelineDate = new Date(start);
		animateTimelineDate.setHours(0);
	}else{
		animateTimelineDate.setYear(parseInt(animateTimelineDate.getFullYear()) + stepYear);
		animateTimelineDate.setHours(animateTimelineDate.getHours(), parseInt(animateTimelineDate.getMinutes()) + stepHours);
		timeline.setCustomTime(animateTimelineDate, 1);
		timeline.redraw();
		
		var dateString = new Date(animateTimelineDate);
		dateString = dateString.formatDDMMYYYY();
		
		setTimeStringAtDate(dateString);
		setSeaLevelAtDate(dateString);
	}
}



function setSeaLevelAtDate(timeString){
	var seaLevel;
	//console.log('setting sea level at ' + timeString);
	// Compare date on timeline with dates/years from data file and set sea level at the corresponding value
	for(var pos = 0; pos < dataArray.length; pos ++){
		var strVal = dataArray[pos][0].split('/');
		var timeOnTimeline = timeString.split('/');
		var stormSurge = 0.0;
		var tide = 0.0;
		
		// If the timeline date is less than the date from the data file, ignore and continue with loop
		
		//console.log(timeString.split('/')[2] + " < " + strVal[2]);
		if(parseInt(timeOnTimeline[2]) < parseInt(strVal[2])){
			break;
		}
		else{
		// Otherwise, set sea level according to position of date in data file
			seaLevel = dataArray[pos][1];
			
			
			// If storm surges enabled, add the values for storm surge and tidal cycle to the UI text
			if(stormSurgesEnabled){
				
				// For every first day of each decade calculate sea level value containing tide and storm surge
				if(timeOnTimeline[0] == "01"){
					var hour = timeline.getCustomTime(1).getHours();
					if(hour >= 0 && hour <=12){
						tide = tideArray[hour][1];
						stormSurge = 0.45;
					}
				}
				
				var calc = (parseFloat(seaLevel) + parseFloat(stormSurge) + parseFloat(tide)).toFixed(3);
				seaLevel = calc.toString();
				
				var tideText = document.querySelector("#tideChangedEvent");
				tide = tide + 'm';
				tideText.innerHTML = tide;
			}
			
			mirrorMeshComplete.visible = true;
			mirrorMesh.visible = false;
			
			mirrorMeshComplete.position.set(0, seaLevel, 0);
			mirrorMesh.position.set(0, seaLevel, 0);
			
			seaLevel = seaLevel + 'm';
			
			document.getElementById('sealevelChangedEvent').innerHTML = seaLevel;
		}
	}
}

function zoomIn() {
	timeline.zoomIn(1);
}

function zoomOut() {
	timeline.zoomOut(1);
}

function setTimeStringAtDate(timeString){
	document.getElementById('datechangeEvent').innerHTML = timeString;
}


function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	requestAnimationFrame( animate );
	render();
	stats.update();
}
var time = 0;
var clock = new THREE.Clock();

function render() {
	time += clock.getDelta();
	water.material.uniforms.time.value = time / 3.0;
	
	controls.update();
	water.render();
	
	if(camera.position.y <= 500){
		camera.near = 10.0;
		camera.updateProjectionMatrix ();
	}
	else if(camera.position.y > 500){
		camera.near = 500.0;
		camera.updateProjectionMatrix ();
	}
	renderer.render( scene, camera );
}