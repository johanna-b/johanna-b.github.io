"use strict";

var canvas;
var gl;

var program;

// matrices
var modelView, projection;

// objects
var _obj_type = 0;
var _obj_radius = 0.5;
var _obj_height = 0.5;

var _obj_x = 0.0;
var _obj_y = 0.0;
var _obj_z = 0.0;

var _obj_x_spin = 0.0;
var _obj_y_spin = 0.0;
var _obj_z_spin = 0.0;

// camera
var _camera_x = 0.0;
var _camera_y = 0.0;
var _camera_z = 0.0;

// rendering
var _render_mode = 0; //wireframe

var _render_distance_attenuation = false;

// lighting
var _light0_enabled = true;
var _light1_enabled = false;
var _selected_light = 0;
var _light_x = 0.0;
var _light_y = 0.0;
var _light_z = 0.0;


// object helper datastructures
var _sphere_latitude_bands = 16;
var _sphere_longitude_bands = 16;

var _object_vertices = [];
var _object_normals = [];
var _object_indices = [];
var _object_index_offsets = [];
var _object_type = [];

// buffers
var _normal_buffer;
var _vertex_buffer;
var _index_buffer;

// light helper
var _light_ambient = vec4(0.2, 0.2, 0.2, 1.0 );
var _light_diffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var _light_specular = vec4( 1.0, 1.0, 1.0, 1.0 );

var _material_ambient = vec4( 1.0, 0.0, 1.0, 1.0 );
var _material_diffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var _material_specular = vec4( 1.0, 0.8, 0.0, 1.0 );
var _material_shininess = 100.0;

var _light0_pos = vec4( 0.0, 0.0, 0.0, 0.0 );
var _light1_pos = vec4( 0.0, 0.0, 0.0, 0.0 );


/*
matrix-vector multiplication
 */
function matVecMul( m, v){

    var res = vec4();

    for ( var m_row = 0; m_row < m.length; ++m_row ) {
        var sum = 0.0;
        for ( var m_col = 0; m_col < v.length; ++m_col ) {
            sum += m[m_row][m_col] * v[m_col];

        }
        res[m_row] = sum;
    }
    return res;
}

/*
create new object (sphere, cone, cylinder)
 */
function createObject()
{
    // create geometry
    var arrays = [];
    if ( _obj_type == 0 ) { //sphere

        console.log("creating new sphere: r: ", _obj_radius, " xyz: ", _obj_x, _obj_y, _obj_z);

        arrays = createSphere(_obj_radius, _obj_x, _obj_y, _obj_z);
        _object_type.push(0);

    } else if (_obj_type == 1 ) { //cone

        console.log("creating new cone: r: ", _obj_radius, "height:", _obj_height, " xyz: ", _obj_x, _obj_y, _obj_z, "rotation: ", _obj_x_spin, _obj_y_spin, _obj_z_spin );

        arrays = createCone(_obj_radius, _obj_height, _obj_x, _obj_y, _obj_z, _obj_x_spin, _obj_y_spin, _obj_z_spin );
        _object_type.push(1);

    } else if (_obj_type == 2 ) { //cylinder

        console.log("creating new cylinder: r: ", _obj_radius, "height:", _obj_height, " xyz: ", _obj_x, _obj_y, _obj_z, "rotation: ", _obj_x_spin, _obj_y_spin, _obj_z_spin );

        arrays = createCylinder(_obj_radius, _obj_height, _obj_x, _obj_y, _obj_z, _obj_x_spin, _obj_y_spin, _obj_z_spin );
        _object_type.push(2);

    }

    // add object geometry to arrays of previous geometry
    _object_vertices = _object_vertices.concat(arrays[0]);
    _object_normals = _object_normals.concat(arrays[1]);
    _object_indices = _object_indices.concat(arrays[2]);

    // download arrays to buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, _normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_object_normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, _vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_object_vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_object_indices), gl.STATIC_DRAW);
    _index_buffer.numItems = _object_indices.length;

    // save offset
    _object_index_offsets.push(arrays[2].length);

}

/*
create sphere geometry, given point and radius
 */
function createSphere(radius, xpos, ypos, zpos)
{
    var vertarray = [];
    var normarray = [];
    var indexarray = [];

    // create vertices
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

    var index_offset = _object_vertices.length;

    // create index array for triangles
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

/*
create cone given point, radius, height, rotation
 */
function createCone(radius, height, xpos, ypos, zpos, xrot, yrot, zrot)
{
    var vertarray = [];
    var normarray = [];
    var indexarray = [];

    //center vertex
    vertarray.push(vec4(0.0, 0.0, 0.0,1.0));
    normarray.push(vec3(0.0, 0.0, 1.0));

    //top vertex
    vertarray.push(vec4(0.0, 0.0,-height,1.0));
    normarray.push(vec3(0.0, 0.0,-1.0));

    // create cone vertices (flat bottom)
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

    var index_offset = _object_vertices.length;

    // create indices of cone
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;
        var top = index_offset + 1;

        indexarray.push(first);
        indexarray.push(first + 1);
        indexarray.push(top);

    }

    // create indices of flat bottom
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;
        var center = index_offset;

        indexarray.push(first);
        indexarray.push(first + 1);
        indexarray.push(center);

    }

    // transformation (translation + rotation)
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

/*
create cylinder geometry
 */
function createCylinder(radius, height, xpos, ypos, zpos, xrot, yrot, zrot)
{
    var vertarray = [];
    var normarray = [];
    var indexarray = [];

    // bottom center vertex
    vertarray.push(vec4(0.0, 0.0, 0.0, 1.0));
    normarray.push(vec3(0.0, 0.0, 1.0));

    // top center vertex
    vertarray.push(vec4(0.0, 0.0, -height,1.0));
    normarray.push(vec3(0.0, 0.0, -1.0));

    // create geometry for bottom and top disk
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

    var index_offset = _object_vertices.length;

    var center_bottom = index_offset;
    var center_top = index_offset+1;

    // indices of cylinder bottom
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; longNumber++) {

        var first = (index_offset + 2) + longNumber;

        indexarray.push(first);
        indexarray.push(first + 1);
        indexarray.push(center_bottom);
    }

    // indices of cylinder top
    for (var longNumber = 0; longNumber < _sphere_longitude_bands; ++longNumber) {

        var first = (index_offset + 2) + longNumber + _sphere_longitude_bands+1;

        indexarray.push(first + 1);
        indexarray.push(first);
        indexarray.push(center_top);

        console.log(center_top, first, first+1);
    }

    // indices for cylinder side walls
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


/*
 selected light's position
 */
function updateLight()
{
    //console.log("updating light source!")
    if ( _selected_light == 0 ) {
        _light0_pos = vec4( _light_x, _light_y, _light_z, 0.0 );
    } else if ( _selected_light == 1 ) {
        _light1_pos = vec4( _light_x, _light_y, _light_z, 0.0 );
    }

    //console.log("light: ", _light0_pos );

}


/*
init function
 */
window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    // ================
    //  load shaders and initialize attribute buffers

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // normal buffer
    _normal_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, _normal_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_object_normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // vertex buffer
    _vertex_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, _vertex_buffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_object_vertices), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // vertex index buffer
    _index_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, _index_buffer );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_object_indices), gl.STATIC_DRAW );
    _index_buffer.itemSize = 1;
    _index_buffer.numItems = _object_indices.length;

    // set up camera and projection matrix

    projection = ortho(-1.5, 1.5, -1.5, 1.5, -100, 100);

    // ================
    // link GUI items

    document.getElementById("menu_object_type").onclick = function(){
        _obj_type = document.getElementById("menu_object_type").selectedIndex;
    };

    document.getElementById("slider_radius").onchange = function(){_obj_radius = parseFloat(event.srcElement.value);};
    document.getElementById("slider_height").onchange = function(){_obj_height = parseFloat(event.srcElement.value);};

    //document.getElementById("check_show_temp_object").onclick = function(){_show_temp_obj = document.getElementById('check_show_temp_object').checked;};

    document.getElementById("slider_x").onchange = function(){_obj_x = parseFloat(event.srcElement.value);};
    document.getElementById("slider_y").onchange = function(){_obj_y = parseFloat(event.srcElement.value);};
    document.getElementById("slider_z").onchange = function(){_obj_z = parseFloat(event.srcElement.value);};

    document.getElementById("slider_x_spin").onchange = function(){_obj_x_spin = parseFloat(event.srcElement.value);};
    document.getElementById("slider_y_spin").onchange = function(){_obj_y_spin = parseFloat(event.srcElement.value);};
    document.getElementById("slider_z_spin").onchange = function(){_obj_z_spin = parseFloat(event.srcElement.value);};

    document.getElementById("button_add_object").onclick = function(){createObject()};

    document.getElementById("slider_camera_x").onchange = function(){_camera_x = parseFloat(event.srcElement.value);};
    document.getElementById("slider_camera_y").onchange = function(){_camera_y = parseFloat(event.srcElement.value);};
    document.getElementById("slider_camera_z").onchange = function(){_camera_z = parseFloat(event.srcElement.value);};

    document.getElementById("menu_render_mode").onclick = function(){
        _render_mode = document.getElementById("menu_render_mode").selectedIndex;
    };

    document.getElementById("check_use_distance_attenuation").onclick = function() {_render_distance_attenuation = document.getElementById('check_use_distance_attenuation').checked;};

    document.getElementById("light0").onclick = function(){_light0_enabled = document.getElementById("light0").checked};
    document.getElementById("light1").onclick = function(){_light1_enabled = document.getElementById("light1").checked};

    document.getElementById("selected_light").onclick = function(){
        _selected_light = document.getElementById("selected_light").selectedIndex;
    };

    document.getElementById("light_x").onchange = function(){_light_x = parseFloat(event.srcElement.value);};
    document.getElementById("light_y").onchange = function(){_light_y = parseFloat(event.srcElement.value);};
    document.getElementById("light_z").onchange = function(){_light_z = parseFloat(event.srcElement.value);};

    document.getElementById("light_x").oninput = function(){
        _light_x = parseFloat(event.srcElement.value);
        updateLight();
    };
    document.getElementById("light_y").oninput = function(){
        _light_y = parseFloat(event.srcElement.value);
        updateLight();
    };
    document.getElementById("light_z").oninput = function(){
        _light_z = parseFloat(event.srcElement.value);
        updateLight();
    };

    document.getElementById("button_update_light").onclick = function(){updateLight()};

    // ===============
    // set uniforms

    // lighting
    var ambientProduct = mult(_light_ambient, _material_ambient);
    var diffuseProduct = mult(_light_diffuse, _material_diffuse);
    var specularProduct = mult(_light_specular, _material_specular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
        flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
        flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),
        flatten(specularProduct) );

    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"),_material_shininess);

    // projection matrix
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),
       false, flatten(projection));

    render();
}

/*
helper function that draws an object given it's geometry
 */
function _renderObject(rendermode, offset_index, running_offset )
{
    if (_render_mode == 0) { //wireframe
        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(1.0, 1.0, 1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset * 2);

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(0.0, 0.0, 0.0)));
        gl.drawElements(gl.LINE_LOOP, offset_index, gl.UNSIGNED_SHORT, running_offset * 2); //offset*sizeof(unsigned_short)

    } else if (_render_mode == 1) { //fill

        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(-1.0, -1.0, -1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset*2);

    } else if (_render_mode == 2) { //shaded
        gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(-1.0, -1.0, -1.0)));
        gl.drawElements(gl.TRIANGLES, offset_index, gl.UNSIGNED_SHORT, running_offset*2);
    }
}

/*
draws a sphere for given sphere geometry
 */
function renderSphere(rendermode, offset_index, running_offset )
{
    _renderObject(rendermode, offset_index, running_offset);
}

/*
 draws a cone for given sphere geometry
 */
function renderCone(rendermode, offset_index, running_offset )
{
    _renderObject(rendermode, offset_index, running_offset);
}

/*
 draws a cylinder for given sphere geometry
 */
function renderCylinder(rendermode, offset_index, running_offset )
{
    _renderObject(rendermode, offset_index, running_offset);
}

/*
render function
 */
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

    var lights_on = [   (_render_mode==2)?1.0:0.0,
                        _light0_enabled?1.0:0.0,
                        _light1_enabled?1.0:0.0,
                        _render_distance_attenuation?1.0:0.0];

    gl.uniform4fv(gl.getUniformLocation(program,
        "lights_enabled"),flatten(lights_on));

    gl.uniform4fv(gl.getUniformLocation(program, "lightPos0"),
        flatten(_light0_pos) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPos1"),
        flatten(_light1_pos) );

    // render objects
    var runningOffset = 0;
    for (var i = 0; i < _object_index_offsets.length; i++ ) {

        if ( _object_type[ i ] == 0 ) {
            renderSphere(_render_mode, _object_index_offsets[i], runningOffset);
        } else if ( _object_type[ i ] == 1 ) {
            renderCone(_render_mode, _object_index_offsets[i], runningOffset);
        } else if ( _object_type[ i ] == 2 ) {
            renderCylinder(_render_mode, _object_index_offsets[i], runningOffset);
        }

        runningOffset += _object_index_offsets[i];
    }

    requestAnimFrame(render);
}


