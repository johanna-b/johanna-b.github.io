"use strict";

var canvas;
var gl;

var numVertices  = 36;

var pointsArray = [];
var normalsArray = [];
var indexArray = [];
var indexItems = 0;

var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4( 0.5,  0.5,  0.5, 1.0 ),
        vec4( 0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4( 0.5,  0.5, -0.5, 1.0 ),
        vec4( 0.5, -0.5, -0.5, 1.0 )
    ];

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

var ctm;
var ambientColor, diffuseColor, specularColor;
var modelView, projection;
var viewerPos;
var program;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
var theta =[0, 0, 0];

var thetaLoc;

var flag = true;


//=============

var _obj_type = 0;
var _obj_radius = 1.0;
var _obj_height = 1.0;
var _show_temp_obj = 0;

var _obj_x = 0.0;
var _obj_y = 0.0;
var _obj_z = 0.0;

var _obj_x_spin = 0.0;
var _obj_y_spin = 0.0;
var _obj_z_spin = 0.0;

var _render_mode = 0; //wireframe
var _render_distance_attenuation = 0;

var _camera_x = 0.0;
var _camera_y = 0.0;
var _camera_z = 0.0;

var _sphere_latitude_bands = 2;
var _sphere_longitude_bands = 2;

var _spheres_vertices = [];
var _spheres_normals = [];
var _spheres_indices = []
var _num_spheres_offset = 0;

var nBuffer;
var vBuffer;
var iBuffer;

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function createObject()
{
    //todo
    console.log("creating new object!")

    var arrays = createSphere(0.2, 0.3, 0.3, 0.0);
    _spheres_vertices = _spheres_vertices.concat( arrays[0] );
    _spheres_normals = _spheres_normals.concat( arrays[1] );
    _spheres_indices = _spheres_indices.concat( arrays[2] );

    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_spheres_normals), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_spheres_vertices), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, iBuffer );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_spheres_indices), gl.STATIC_DRAW );

    iBuffer.numItems = _spheres_indices.length;

    indexItems = iBuffer.numItems;

    console.log(_spheres_vertices);

    console.log("vbuffer: ", vBuffer);
    console.log("ibuffer:", iBuffer);

}

function createSphere(radius, xpos, ypos, zpos)
{
    //pointsArray = [];
    //normalsArray = [];
    //indexArray = [];

    var vertarray = [];
    var normarray = [];
    var indexarray = [];

    var count = 0;

    for (var latNumber = 0; latNumber <= _sphere_latitude_bands; latNumber++) {
        var theta = latNumber * Math.PI / _sphere_latitude_bands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= _sphere_longitude_bands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / _sphere_longitude_bands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            //var u = 1 - (longNumber / _sphere_longitude_bands);
            //var v = 1 - (latNumber / _sphere_latitude_bands);

            normarray.push(vec3(x, y, z));
            //normalData.push(x);
            //normalData.push(y);
            //normalData.push(z);

            //textureCoordData.push(u);
            //textureCoordData.push(v);

            vertarray.push(vec4(radius * x + xpos, radius * y + ypos, radius * z + zpos, 1.0));
            //vertexPositionData.push(radius * x + xpos);
            //vertexPositionData.push(radius * y + ypos);
            //vertexPositionData.push(radius * z + zpos);

            //console.log(radius * x + xpos, radius * y + ypos, radius * z + zpos, 1.0);
            count++;
        }
    }

    console.log("num points: ", count);

    count = 0;


    var index_offset = _spheres_vertices.length;



    for (var latNumber = 0; latNumber < _sphere_latitude_bands; latNumber++) {
        for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

            var first = index_offset + (latNumber * (_sphere_longitude_bands + 1)) + longNumber;
            var second = first + _sphere_longitude_bands + 1;

            if ( _render_mode == 0 ) {
                // indices for first triangle
                indexarray.push(first);
                indexarray.push(second);

                indexarray.push(second);
                indexarray.push(first + 1);

                indexarray.push(first + 1);
                indexarray.push(first);

                // indices for second triangle
                indexarray.push(second);
                indexarray.push(second + 1);

                indexarray.push(second + 1);
                indexarray.push(first + 1);

                indexarray.push(first + 1);
                indexarray.push(second);

                count +=6;
            } else if ( _render_mode == 1 ) {
                // indices for first triangle
                indexarray.push(first);
                indexarray.push(second);
                indexarray.push(first + 1);

                // indices for second triangle
                indexarray.push(second);
                indexarray.push(second + 1);
                indexarray.push(first + 1);

                count += 2;
            } else {
                console.log( "unsupported render mode!");
            }

        }
    }

    console.log("num primitives: ", count);

    return [vertarray, normarray, indexarray];

}

function addLight()
{
    //todo
    console.log("creating new light source!")
}



window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    // ================
    //  Load shaders and initialize attribute buffers
    // todo

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    //colorCube();
    var arrays = createSphere(0.2, 0.0, 0.0, 0.0);

    _spheres_vertices =  _spheres_vertices.concat( arrays[0] );
    _spheres_normals = _spheres_normals.concat( arrays[1] );
    _spheres_indices = _spheres_indices.concat( arrays[2] );

    //createObject();


    // normal buffer
    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_spheres_normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    console.log("nbuffer: ", _spheres_normals.length);


    // vertex buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_spheres_vertices), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    console.log("vertex buffer: ", _spheres_vertices.length);


    // vertex index buffer
    iBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, iBuffer );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_spheres_indices), gl.STATIC_DRAW );
    iBuffer.itemSize = 1;
    iBuffer.numItems = _spheres_indices.length;

    indexItems = iBuffer.numItems;
    console.log("index buffer: ", iBuffer.numItems);

    //createObject();

    //thetaLoc = gl.getUniformLocation(program, "theta");

    viewerPos = vec3(0.0, 0.0, -20.0 );

    projection = ortho(-1, 1, -1, 1, -100, 100);

    //var ambientProduct = mult(lightAmbient, materialAmbient);
    //var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    //var specularProduct = mult(lightSpecular, materialSpecular);

    // ================
    // link GUI items

    document.getElementById("menu_object_type").onclick = function(){
        _obj_type = document.getElementById("menu_object_type").selectedIndex;
    };

    document.getElementById("slider_radius").onchange = function(){_obj_radius = event.srcElement.value;};
    document.getElementById("slider_height").onchange = function(){_obj_height = event.srcElement.value;};

    document.getElementById("check_show_temp_object").onclick = function(){_show_temp_obj = document.getElementById('check_show_temp_object').checked;};

    document.getElementById("slider_x").onchange = function(){_obj_x = event.srcElement.value;};
    document.getElementById("slider_y").onchange = function(){_obj_y = event.srcElement.value;};
    document.getElementById("slider_z").onchange = function(){_obj_z = event.srcElement.value;};

    document.getElementById("slider_x_spin").onchange = function(){_obj_x_spin = event.srcElement.value;};
    document.getElementById("slider_y_spin").onchange = function(){_obj_y_spin = event.srcElement.value;};
    document.getElementById("slider_z_spin").onchange = function(){_obj_z_spin = event.srcElement.value;};

    document.getElementById("button_add_object").onclick = function(){createObject()};

    document.getElementById("menu_render_mode").onclick = function(){
        _render_mode = document.getElementById("menu_render_mode").selectedIndex;
    };

    document.getElementById("button_add_light").onclick = function(){addLight()};

    document.getElementById("check_use_distance_attenuation").onclick = function() {_render_distance_attenuation = document.getElementById('check_use_distance_attenuation').checked;};

    document.getElementById("slider_camera_x").onchange = function(){_camera_x = event.srcElement.value;};
    document.getElementById("slider_camera_y").onchange = function(){_camera_y = event.srcElement.value;};
    document.getElementById("slider_camera_z").onchange = function(){_camera_z = event.srcElement.value;};

    // ===============
    // set uniforms
    // todo

/*
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
       flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
       flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
       flatten(specularProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),
       flatten(lightPosition) );

    gl.uniform1f(gl.getUniformLocation(program,
       "shininess"),materialShininess);
       */

    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),
       false, flatten(projection));

    render();
}

var render = function(){

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if(flag) theta[axis] += 2.0;

    modelView = mat4();
    //modelView = mult(modelView, rotate(theta[xAxis], [1, 0, 0] ));
    //modelView = mult(modelView, rotate(theta[yAxis], [0, 1, 0] ));
    //modelView = mult(modelView, rotate(theta[zAxis], [0, 0, 1] ));

    gl.uniformMatrix4fv( gl.getUniformLocation(program,
            "modelViewMatrix"), false, flatten(modelView) );

    if (_render_mode == 0) { //wireframe
        //console.log("rendering wireframe!")
        gl.drawElements(gl.LINES, indexItems, gl.UNSIGNED_SHORT, 0);
    } else if (_render_mode == 1){ //fill
        //console.log("rendering solid object!")
        gl.drawElements(gl.TRIANGLES, indexItems, gl.UNSIGNED_SHORT, 0);
    }

    /*
    var numSpheres = _spheres.length;
    for ( var i=0; i<numSpheres; i++ ) {
        gl.drawArrays( gl.TRIANGLES, sphereStartIdx[i], numPointsPerLine[i] );
    }*/

    requestAnimFrame(render);
}
