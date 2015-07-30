"use strict";

var canvas;
var gl;


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
var _obj_radius = 0.5;
var _obj_height = 0.5;
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

var _sphere_latitude_bands = 16;
var _sphere_longitude_bands = 16;

var _spheres_vertices = [];
var _spheres_normals = [];
var _spheres_indices = [];
var _spheres_index_offsets = [];
var _spheres_type = [];
var _num_spheres_offset = 0;

var nBuffer;
var vBuffer;
var iBuffer;

function matVecMul( m, v){

    var res = vec4();

    for ( var m_row = 0; m_row < m.length; ++m_row ) {
        var sum = 0.0;
        for ( var m_col = 0; m_col < v.length; ++m_col ) {
            sum += m[m_row][m_col] * v[m_col];

        }
       // console.log("index: ", m_row, "val:", sum);
        res[m_row] = sum;
    }
    return res;
}


function createObject()
{
    var arrays = [];
    if ( _obj_type == 0 ) { //sphere

        console.log("creating new sphere: r: ", _obj_radius, " xyz: ", _obj_x, _obj_y, _obj_z);

        arrays = createSphere(_obj_radius, _obj_x, _obj_y, _obj_z);
        _spheres_type.push(0);

    } else if (_obj_type == 1 ) { //cone

        console.log("creating new cone: r: ", _obj_radius, "height:", _obj_height, " xyz: ", _obj_x, _obj_y, _obj_z, "rotation: ", _obj_x_spin, _obj_y_spin, _obj_z_spin );

        arrays = createCone(_obj_radius, _obj_height, _obj_x, _obj_y, _obj_z, _obj_x_spin, _obj_y_spin, _obj_z_spin );
        _spheres_type.push(1);

    } else if (_obj_type == 2 ) { //cylinder

        console.log("creating new cylinder: r: ", _obj_radius, "height:", _obj_height, " xyz: ", _obj_x, _obj_y, _obj_z, "rotation: ", _obj_x_spin, _obj_y_spin, _obj_z_spin );

        arrays = createCylinder(_obj_radius, _obj_height, _obj_x, _obj_y, _obj_z, _obj_x_spin, _obj_y_spin, _obj_z_spin );
        _spheres_type.push(2);

    }

    _spheres_vertices = _spheres_vertices.concat(arrays[0]);
    _spheres_normals = _spheres_normals.concat(arrays[1]);
    _spheres_indices = _spheres_indices.concat(arrays[2]);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_spheres_normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_spheres_vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_spheres_indices), gl.STATIC_DRAW);

    iBuffer.numItems = _spheres_indices.length;

    _spheres_index_offsets.push(arrays[2].length);

}

function createSphere(radius, xpos, ypos, zpos)
{
    var vertarray = [];
    var normarray = [];
    var indexarray = [];

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

            //textureCoordData.push(u);
            //textureCoordData.push(v);

            vertarray.push(vec4(radius * x + xpos, radius * y + ypos, radius * z + zpos, 1.0));
        }
    }

    var index_offset = _spheres_vertices.length;

    for (var latNumber = 0; latNumber < _sphere_latitude_bands; latNumber++) {
        for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

            var first = index_offset + (latNumber * (_sphere_longitude_bands + 1)) + longNumber;
            var second = first + _sphere_longitude_bands + 1;

            // indices for first triangle
            indexarray.push(first);
            indexarray.push(second);
            indexarray.push(first + 1);

            // indices for second triangle
            indexarray.push(second);
            indexarray.push(second + 1);
            indexarray.push(first + 1);

        }
    }

    return [vertarray, normarray, indexarray];

}

function createCone(radius, height, xpos, ypos, zpos, xrot, yrot, zrot)
{
    var vertarray = [];
    var normarray = [];
    var indexarray = [];

    //center
    vertarray.push(vec4(0.0, 0.0, 0.0,1.0));
    normarray.push(vec3(0.0, 0.0, 1.0));

    //top
    vertarray.push(vec4(0.0, 0.0,-height,1.0));
    normarray.push(vec3(0.0, 0.0,-1.0));

    for (var longNumber = 0; longNumber <= _sphere_longitude_bands; longNumber++) {
        var phi = longNumber * 2 * Math.PI / _sphere_longitude_bands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);

        var x = sinPhi;
        var y = cosPhi;
        var z = 0.0;
        //var u = 1 - (longNumber / _sphere_longitude_bands);
        //var v = 1 - (latNumber / _sphere_latitude_bands);

        normarray.push(vec3(x, y, z));

        //textureCoordData.push(u);
        //textureCoordData.push(v);

        vertarray.push(vec4(radius * x, radius * y, 0.0, 1.0));

    }

    var index_offset = _spheres_vertices.length;

    // cone
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;
        var top = index_offset + 1;

        // indices for first triangle
        indexarray.push(first);
        indexarray.push(first + 1);
        indexarray.push(top);

    }

    // flat bottom
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;
        var center = index_offset;

        // indices for first triangle
        indexarray.push(first);
        indexarray.push(first + 1);
        indexarray.push(center);

    }

    // transformation
    //+t/R/-t/T

    // rotation
    var trafo = mat4();

    trafo = translate(xpos, ypos, ypos);

    var trans1 = mat4();
    trans1 = translate(0,0,-height/2.0);

    var rot = mat4();
    rot = mult(rot, rotate( xrot, [1, 0, 0] ));
    rot = mult(rot, rotate( yrot, [0, 1, 0] ));
    rot = mult(rot, rotate( zrot, [0, 0, 1] ));

    var trans2 = mat4();
    trans2 = translate(0,0,height/2.0);

    trafo = mult(trafo, trans1);
    trafo = mult(trafo, rot);
    trafo = mult(trafo, trans2);

    for ( var i = 0; i < vertarray.length; i++ ){
        vertarray[i] = matVecMul(trafo, vertarray[i]); //matVecMul
    }

    return [vertarray, normarray, indexarray];
}

function createCylinder(radius, height, xpos, ypos, zpos, xrot, yrot, zrot)
{
    var vertarray = [];
    var normarray = [];
    var indexarray = [];

    //todo: rotate

    vertarray.push(vec4(0.0, 0.0, 0.0, 1.0));
    normarray.push(vec3(0.0, 0.0, 1.0));

    vertarray.push(vec4(0.0, 0.0, -height,1.0));
    normarray.push(vec3(0.0, 0.0, -1.0));

    for ( var discNumber = 0; discNumber < 2; ++discNumber) {
        var heightoffset = -discNumber * height;
        for (var longNumber = 0; longNumber <= _sphere_longitude_bands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / _sphere_longitude_bands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = sinPhi;
            var y = cosPhi;
            var z = 0.0;
            //var u = 1 - (longNumber / _sphere_longitude_bands);
            //var v = 1 - (latNumber / _sphere_latitude_bands);

            normarray.push(vec3(x, y, z));

            //textureCoordData.push(u);
            //textureCoordData.push(v);

            vertarray.push(vec4(radius * x, radius * y, heightoffset, 1.0));

            //console.log( "radius:", radius, "y:", y, "r*y:", radius*y, "ypos:", ypos, "r*y+ypos", (radius*y)+ypos);
            //console.log(radius * x, radius * y, heightoffset, 1.0);
        }
    }

    var index_offset = _spheres_vertices.length;

    var center_bottom = index_offset;
    var center_top = index_offset+1;

    //bottom
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;

        // indices for first triangle
        indexarray.push(first);
        indexarray.push(first + 1);
        indexarray.push(center_bottom);
    }

    //top
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; ++longNumber) {

        var first = (index_offset + 2) + longNumber + _sphere_longitude_bands+1;

        // indices for first triangle
        indexarray.push(first + 1);
        indexarray.push(first);
        indexarray.push(center_top);

        console.log(center_top, first, first+1);
    }

    //walls
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;
        var second = (index_offset + 2) + longNumber + _sphere_longitude_bands+1;

        // indices for first triangle
        indexarray.push(first);
        indexarray.push(second);
        indexarray.push(first + 1);

        // indices for second triangle
        indexarray.push(second);
        indexarray.push(second + 1);
        indexarray.push(first + 1);
    }

    // transformation
    //+t/R/-t/T

    // rotation
    var trafo = mat4();

    trafo = translate(xpos, ypos, ypos);

    var trans1 = mat4();
    trans1 = translate(0,0,-height/2.0);

    var rot = mat4();
    rot = mult(rot, rotate( xrot, [1, 0, 0] ));
    rot = mult(rot, rotate( yrot, [0, 1, 0] ));
    rot = mult(rot, rotate( zrot, [0, 0, 1] ));

    var trans2 = mat4();
    trans2 = translate(0,0,height/2.0);

    trafo = mult(trafo, trans1);
    trafo = mult(trafo, rot);
    trafo = mult(trafo, trans2);

    for ( var i = 0; i < vertarray.length; i++ ){
        vertarray[i] = matVecMul(trafo, vertarray[i]); //matVecMul
    }

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

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // normal buffer
    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_spheres_normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // vertex buffer
    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_spheres_vertices), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // vertex index buffer
    iBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, iBuffer );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_spheres_indices), gl.STATIC_DRAW );
    iBuffer.itemSize = 1;
    iBuffer.numItems = _spheres_indices.length;

    // set up camera and projection matrix

    viewerPos = vec3(0.0, 0.0, -20.0 );

    projection = ortho(-1.5, 1.5, -1.5, 1.5, -100, 100);

    //var ambientProduct = mult(lightAmbient, materialAmbient);
    //var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    //var specularProduct = mult(lightSpecular, materialSpecular);

    // ================
    // link GUI items

    document.getElementById("menu_object_type").onclick = function(){
        _obj_type = document.getElementById("menu_object_type").selectedIndex;
    };

    document.getElementById("slider_radius").onchange = function(){_obj_radius = parseFloat(event.srcElement.value);};
    document.getElementById("slider_height").onchange = function(){_obj_height = parseFloat(event.srcElement.value);};

    document.getElementById("check_show_temp_object").onclick = function(){_show_temp_obj = document.getElementById('check_show_temp_object').checked;};

    document.getElementById("slider_x").onchange = function(){_obj_x = parseFloat(event.srcElement.value);};
    document.getElementById("slider_y").onchange = function(){_obj_y = parseFloat(event.srcElement.value);};
    document.getElementById("slider_z").onchange = function(){_obj_z = parseFloat(event.srcElement.value);};

    document.getElementById("slider_x_spin").onchange = function(){_obj_x_spin = parseFloat(event.srcElement.value);};
    document.getElementById("slider_y_spin").onchange = function(){_obj_y_spin = parseFloat(event.srcElement.value);};
    document.getElementById("slider_z_spin").onchange = function(){_obj_z_spin = parseFloat(event.srcElement.value);};

    document.getElementById("button_add_object").onclick = function(){createObject()};

    document.getElementById("menu_render_mode").onclick = function(){
        _render_mode = document.getElementById("menu_render_mode").selectedIndex;
    };

    document.getElementById("button_add_light").onclick = function(){addLight()};

    document.getElementById("check_use_distance_attenuation").onclick = function() {_render_distance_attenuation = document.getElementById('check_use_distance_attenuation').checked;};

    document.getElementById("slider_camera_x").onchange = function(){_camera_x = parseFloat(event.srcElement.value);};
    document.getElementById("slider_camera_y").onchange = function(){_camera_y = parseFloat(event.srcElement.value);};
    document.getElementById("slider_camera_z").onchange = function(){_camera_z = parseFloat(event.srcElement.value);};

    // ===============
    // set uniforms

    //thetaLoc = gl.getUniformLocation(program, "theta");

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


function renderSphere(rendermode, offset_index, running_offset )
{

    if (_render_mode == 0) { //wireframe
        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(1.0, 1.0, 1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset * 2);

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(0.0, 0.0, 0.0)));
        gl.drawElements(gl.LINE_LOOP, offset_index, gl.UNSIGNED_SHORT, running_offset * 2); //offset*sizeof(unsigned_short)

    } else if (_render_mode == 1) { //fill

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(-1.0, -1.0, -1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset*2);
    }

}

function renderCone(rendermode, offset_index, running_offset )
{

    if (_render_mode == 0) { //wireframe
        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(1.0, 1.0, 1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset * 2);

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(0.0, 0.0, 0.0)));
        gl.drawElements(gl.LINE_LOOP, offset_index, gl.UNSIGNED_SHORT, running_offset * 2); //offset*sizeof(unsigned_short)

    } else if (_render_mode == 1) { //fill

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(-1.0, -1.0, -1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset*2);
    }

}

function renderCylinder(rendermode, offset_index, running_offset )
{

    if (_render_mode == 0) { //wireframe
        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(1.0, 1.0, 1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset * 2);

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(0.0, 0.0, 0.0)));
        gl.drawElements(gl.LINE_LOOP, offset_index, gl.UNSIGNED_SHORT, running_offset * 2); //offset*sizeof(unsigned_short)

    } else if (_render_mode == 1) { //fill

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(-1.0, -1.0, -1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset*2);
    }

}

var render = function(){

    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    modelView = mat4();
    modelView = mult(modelView, rotate(_camera_x, [1, 0, 0] ));
    modelView = mult(modelView, rotate(_camera_y, [0, 1, 0] ));
    modelView = mult(modelView, rotate(_camera_z, [0, 0, 1] ));

    gl.uniformMatrix4fv( gl.getUniformLocation(program,
            "modelViewMatrix"), false, flatten(modelView) );

    var runningOffset = 0;
    for (var i = 0; i < _spheres_index_offsets.length; i++ ) {

        if ( _spheres_type[ i ] == 0 ) {
            renderSphere(_render_mode, _spheres_index_offsets[i], runningOffset);
        } else if ( _spheres_type[ i ] == 1 ) {
            renderCone(_render_mode, _spheres_index_offsets[i], runningOffset);
        } else if ( _spheres_type[ i ] == 2 ) {
            renderCylinder(_render_mode, _spheres_index_offsets[i], runningOffset);
        }

        runningOffset += _spheres_index_offsets[i];
    }

    requestAnimFrame(render);
}


