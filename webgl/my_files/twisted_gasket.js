"use strict";

var canvas;
var gl;

var points = [];

var num_subdivisions = 0;
var theta = 0.0;
var twist_scale = 0.0;
var render_outline = false;

var theta_loc;
var twist_scale_loc;

// First, initialize the corners of our gasket with three points.

var vertices = [
    vec2( -0.5, -0.5 ),
    vec2(  0,  0.5 ),
    vec2(  0.5, -0.5 )
];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8*Math.pow(6, 6), gl.STATIC_DRAW );
    //gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    theta_loc = gl.getUniformLocation( program, "theta" );
    twist_scale_loc = gl.getUniformLocation( program, "twist_scale" );

    document.getElementById("slider_subdivisions").onchange = function() {
        num_subdivisions = event.srcElement.value;
        render();
    };

    document.getElementById("slider_theta").onchange = function() {
        theta = event.srcElement.value;
        render();
    };

    document.getElementById("slider_twist_scale").onchange = function() {
        twist_scale = event.srcElement.value;
        render();
    };

    document.getElementById("checkbox_renderstyle").onclick = function() {
        render_outline = document.getElementById('checkbox_renderstyle').checked;
        render();
    };

    render();
};

function triangle( a, b, c )
{
    points.push( a, b, c );
}

function lines( a, b, c )
{
    points.push( a, b );
    points.push( b, c );
    points.push( c, a );
}

function divideTriangle( a, b, c, count )
{

    // check for end of recursion

    if ( count === 0 ) {
        if ( render_outline ) {
            lines( a, b, c );
        } else {
            triangle(a, b, c);
        }

    }
    else {

        //bisect the sides

        var ab = mix( a, b, 0.5 );
        var ac = mix( a, c, 0.5 );
        var bc = mix( b, c, 0.5 );

        --count;

        // four new triangles
        divideTriangle( a, ab, ac, count );
        divideTriangle( c, ac, bc, count );
        divideTriangle( b, bc, ab, count );
        divideTriangle( ab, bc, ac, count );
    }
}

function render()
{
    points = [];

    divideTriangle( vertices[0], vertices[1], vertices[2],
        num_subdivisions);

    //console.log("points:");
    //console.log(points)

    var scaledTheta = ( theta / 180.0 ) * Math.PI;
    gl.uniform1f( theta_loc, scaledTheta );
    gl.uniform1f( twist_scale_loc, twist_scale );
    console.log( "twist: ", twist_scale )

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));
    gl.clear( gl.COLOR_BUFFER_BIT );

    if ( render_outline ) {
        gl.drawArrays(gl.LINES, 0, points.length);
    } else {
        gl.drawArrays( gl.TRIANGLES, 0, points.length );
    }
}
