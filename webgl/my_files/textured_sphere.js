"use strict";

var canvas;
var gl;

var program;

// matrices
var modelView, projection;

// objects
var _obj_radius = 0.99;

var _obj_x = 0.0;
var _obj_y = 0.0;
var _obj_z = 0.0;

var _obj_x_spin = 0.0;
var _obj_y_spin = 0.0;
var _obj_z_spin = 0.0;

// object helper datastructures
var _sphere_latitude_bands = 64;
var _sphere_longitude_bands = 64;

var _object_vertices = [];
var _object_normals = [];
var _object_indices = [];
var _object_tex_coords = [];

// buffers
var _normal_buffer;
var _vertex_buffer;
var _index_buffer;
var _tex_buffer;

var _num_elems = 0;

// texturing

var _texture_type = 0.0;

var _tex_array_checkerboard;

var _tex_checkerboard;
var _tex_image;

var _tex_height = 64;
var _tex_width = 64;

var _img_width = 0;
var _img_height = 0;

var _img;

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

    console.log('creating sphere;', _obj_radius, _obj_x, _obj_y, _obj_z);
   arrays =  createSphere(_obj_radius, _obj_x, _obj_y, _obj_z);

    // add object geometry to arrays of previous geometry
    _object_vertices = [];
    _object_normals = [];
    _object_tex_coords = []
    _object_indices = [];

    _object_vertices = _object_vertices.concat(arrays[0]);
    _object_normals = _object_normals.concat(arrays[1]);
    _object_indices = _object_indices.concat(arrays[2]);
    _object_tex_coords = _object_tex_coords.concat(arrays[3]);

    // download arrays to buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, _normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_object_normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, _vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_object_vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, _tex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(_object_tex_coords), gl.STATIC_DRAW);


    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_object_indices), gl.STATIC_DRAW);
    _index_buffer.numItems = _object_indices.length;

    _num_elems = arrays[2].length;

}

/*
create sphere geometry, given point and radius
 */
function createSphere(radius, xpos, ypos, zpos)
{

    var vertarray = [];
    var normarray = [];
    var indexarray = [];
    var texarray = [];

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

            var u = 1 - (longNumber / _sphere_longitude_bands);
            var v = 1 - (latNumber / _sphere_latitude_bands);

            normarray.push(vec3(x, y, z));

            texarray.push(u);
            texarray.push(v);

            //console.log("point: ", radius * x + xpos, radius * y + ypos, radius * z + zpos, 1.0);

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

    return [vertarray, normarray, indexarray, texarray];
}



function configureTexture() {

    //console.log(_tex_array_checkerboard);
    _tex_checkerboard = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, _tex_checkerboard );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _tex_width, _tex_height , 0, gl.RGBA, gl.UNSIGNED_BYTE, _tex_array_checkerboard);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    _tex_image = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, _tex_image );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _img);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function makeCheckerboard()
{
    _tex_array_checkerboard = new Uint8Array(4*_tex_height*_tex_width);

    var c;
    var numChecks = 8;

    for ( var i = 0; i < _tex_height; i++ ) {
        for ( var j = 0; j <_tex_width; j++ ) {

            var patchx = Math.floor(i/(_tex_width/numChecks));
            var patchy = Math.floor(j/(_tex_height/numChecks));
            if(patchx%2 ^ patchy%2) c = 255;
            else c = 0;
            //c = 255*(((i & 0x8) == 0) ^ ((j & 0x8)  == 0))
            _tex_array_checkerboard[4*i*_tex_width+4*j] = c;
            _tex_array_checkerboard[4*i*_tex_width+4*j+1] = c;
            _tex_array_checkerboard[4*i*_tex_width+4*j+2] = c;
            _tex_array_checkerboard[4*i*_tex_width+4*j+3] = 255;
            //console.log(c, patchx, patchy, 4*i*_tex_width+4*j);
        }
    }
}

/*
init function
 */
window.onload = function init() {

    _img = new Image();
    _img.src = "http://johanna-b.github.io/webgl/my_files/tc-earth_daymap.jpg";
   // _img.src = "http://localhost:63343/webgl/my_files/tc-earth_daymap.jpg";  // MUST BE SAME DOMAIN!!!
    _img.onload = function () {
        console.log("texture image loaded.");

        _img_width = this.width;
        _img_height = this.height;

        generalInit();
    }
}


var generalInit = function(){

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

    _tex_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, _tex_buffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(_object_tex_coords), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    // vertex index buffer
    _index_buffer = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, _index_buffer );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_object_indices), gl.STATIC_DRAW );
    _index_buffer.itemSize = 1;
    _index_buffer.numItems = _object_indices.length;

    createObject();

    makeCheckerboard();
    configureTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, _tex_checkerboard );
    gl.uniform1i(gl.getUniformLocation( program, "Tex0"), 0);

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, _tex_image );
    gl.uniform1i(gl.getUniformLocation( program, "Tex1"), 1);


    // set up camera and projection matrix

    projection = ortho(-1.5, 1.5, -1.5, 1.5, -100, 100);

    // ================
    // link GUI items

    document.getElementById("menu_texture_type").onclick = function(){
        _texture_type = document.getElementById("menu_texture_type").selectedIndex;
        render();
    };


    document.getElementById("slider_x_spin").onchange = function(){_obj_x_spin = parseFloat(event.srcElement.value);};
    document.getElementById("slider_y_spin").onchange = function(){_obj_y_spin = parseFloat(event.srcElement.value);};
    document.getElementById("slider_z_spin").onchange = function(){_obj_z_spin = parseFloat(event.srcElement.value);};

    document.getElementById("slider_x_spin").oninput = function(){
        _obj_x_spin = parseFloat(event.srcElement.value);
//todo
    };
    document.getElementById("slider_y_spin").oninput = function(){
        _obj_y_spin = parseFloat(event.srcElement.value);

    };
    document.getElementById("slider_z_spin").oninput = function(){
        _obj_z_spin = parseFloat(event.srcElement.value);

    };


    // ===============
    // set uniforms

    gl.uniform1f(gl.getUniformLocation(program, "TexType"),_texture_type);

    // projection matrix
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),
       false, flatten(projection));

    render();
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
    modelView = mult(modelView, rotate(_obj_x_spin, [1, 0, 0] ));
    modelView = mult(modelView, rotate(_obj_y_spin, [0, 1, 0] ));
    modelView = mult(modelView, rotate(_obj_z_spin, [0, 0, 1] ));

    gl.uniformMatrix4fv( gl.getUniformLocation(program,
            "modelViewMatrix"), false, flatten(modelView) );

    // render object
    gl.uniform3fv(gl.getUniformLocation(program, "col"), flatten(vec3(-1.0, -1.0, -1.0)));

    gl.uniform1f(gl.getUniformLocation(program, "TexType"),_texture_type);

    gl.drawElements(gl.TRIANGLES, _num_elems, gl.UNSIGNED_SHORT, 0);

    requestAnimFrame(render);
}


