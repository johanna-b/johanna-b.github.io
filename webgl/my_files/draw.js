"use strict";

var canvas;
var gl;

var maxNumVertices  = 500000;
var index = 0;

var cindex = 0;

var colors = [

    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0)   // cyan
];
var t;

var is_mouse_pressed = false;
var numLines = 0;
var numPointsPerLine = [];
var lineStartIdx = [];
var lineWidth = [];
var line_width = 1;

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    var colormenu = document.getElementById("mymenu");

    colormenu.addEventListener("click", function() {
       cindex = colormenu.selectedIndex;
        });


    document.getElementById("slider_linewidth").onchange = function() {
        line_width = event.srcElement.value;
        render();
    };

    canvas.addEventListener("mousedown", function(event){

        is_mouse_pressed = true;

        // create new line


        t  = vec2(2*event.clientX/canvas.width-1,
           2*(canvas.height-event.clientY)/canvas.height-1);
        gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

        t = vec4(colors[cindex]);

        gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
        gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));

        numLines++;
        lineStartIdx[numLines-1] = index;
        numPointsPerLine[numLines-1] = 1;
        lineWidth[numLines-1] = line_width;

        index++;

        render();

    } );

    canvas.addEventListener("mousemove", function(event){
        if ( is_mouse_pressed ) {
            console.log("move");

            t  = vec2(2*event.clientX/canvas.width-1,
                2*(canvas.height-event.clientY)/canvas.height-1);
            gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
            gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(t));

            t = vec4(colors[cindex]);

            gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(t));

            numPointsPerLine[numLines-1]++;

            index++;

            render();
        }
    });

    canvas.addEventListener("mouseup", function(event){
        is_mouse_pressed = false;

        render();
    });


    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );


    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW );
    var vPos = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPos, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPos );

    var cBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW );
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
}

function render() {

    gl.clear( gl.COLOR_BUFFER_BIT );



    for(var i=0; i<numLines; i++) {
        gl.lineWidth(lineWidth[i]);
        gl.drawArrays( gl.LINE_STRIP, lineStartIdx[i], numPointsPerLine[i] );
    }
}
