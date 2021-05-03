// wgld.org WebGL2.0 sample.015

(function(){
    'use strict';

    // variables
    var gl, run, canvas, canvasWidth, canvasHeight, camera;
    var targetImageData, imageWidth, imageHeight;
    var mousePosition, isMousedown, mouseMovePower;
    canvasWidth = 512;
    canvasHeight = 512;
    imageWidth = 256;
    imageHeight = 256;

    window.addEventListener('load', function(){
        var e = document.getElementById('info');

        // canvas initialize
        canvas = document.getElementById('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        mousePosition = [0.0, 0.0];
        isMousedown = false;
        mouseMovePower = 0.0;

        // mousemove event
        canvas.addEventListener('mousedown', function(eve){
            isMousedown = true;
            mouseMovePower = 1.0;
        }, false);
        canvas.addEventListener('mouseup', function(eve){
            isMousedown = false;
        }, false);
        canvas.addEventListener('mousemove', function(eve){
            var bound = eve.currentTarget.getBoundingClientRect();
            var x = eve.clientX - bound.left;
            var y = eve.clientY - bound.top;
            mousePosition = [
                x / bound.width * 2.0 - 1.0,
                -(y / bound.height * 2.0 - 1.0)
            ];
        }, false);

        // webgl2 initialize
        gl = canvas.getContext('webgl2');
        if(gl){
            e.textContent = 'ready';
        }else{
            e.textContent = 'webgl2 unsupported';
            console.log('webgl2 unsupported');
            return;
        }

        // window keydown event
        window.addEventListener('keydown', function(eve){
            run = eve.keyCode !== 27;
        }, false);

        // generate imagedata
        var img = new Image();
        img.addEventListener('load', function(){
            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');
            c.width = imageWidth;
            c.height = imageHeight;
            ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
            targetImageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
            init();
        }, false);
        img.src = 'lenna.jpg';

        function init(){
            // transform feedback object
            var transformFeedback = gl.createTransformFeedback();
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);

            // out variable names
            var outVaryings = ['vPosition', 'vVelocity', 'vColor'];

            // transform out shader
            var vs = create_shader('vs_transform');
            var fs = create_shader('fs_transform');
            var prg = create_program_tf_separate(vs, fs, outVaryings);// bind Transform Object
            var attLocation = [];
            attLocation[0] = 0;
            attLocation[1] = 1;
            attLocation[2] = 2;
            var attStride = [];
            attStride[0] = 3;
            attStride[1] = 3;
            attStride[2] = 4;
            var uniLocation = [];
            uniLocation[0] = gl.getUniformLocation(prg, 'time');
            uniLocation[1] = gl.getUniformLocation(prg, 'mouse');
            uniLocation[2] = gl.getUniformLocation(prg, 'move');

            // feedback in shader
            vs = create_shader('vs_main');
            fs = create_shader('fs_main');
            var fPrg = create_program(vs, fs);
            var fAttLocation = [];
            fAttLocation[0] = 0;
            fAttLocation[1] = 1;
            fAttLocation[2] = 2;
            var fAttStride = [];
            fAttStride[0] = 3;
            fAttStride[1] = 3;
            fAttStride[2] = 4;
            var fUniLocation = [];
            fUniLocation[0] = gl.getUniformLocation(fPrg, 'vpMatrix');
            fUniLocation[1] = gl.getUniformLocation(fPrg, 'move');

            // vertices
            var position = [];
            var velocity = [];
            var color = [];
            (function(){
                var i, j, k, l, m;
                var x, y, vx, vy;
                for(i = 0; i < imageHeight; ++i){
                    y = i / imageHeight * 2.0 - 1.0;
                    k = i * imageWidth;
                    for(j = 0; j < imageWidth; ++j){
                        x = j / imageWidth * 2.0 - 1.0;
                        l = (k + j) * 4;
                        position.push(x, -y, 0.0);
                        m = Math.sqrt(x * x + y * y);
                        velocity.push(x / m, -y / m, 0.0);
                        color.push(
                            targetImageData.data[l]     / 255,
                            targetImageData.data[l + 1] / 255,
                            targetImageData.data[l + 2] / 255,
                            targetImageData.data[l + 3] / 255
                        );
                    }
                }
            })();

            // create vbo
            // 書き込み用、読み出し用のVBOを作る
            var VBOArray = [
                [
                    create_vbo(position),
                    create_vbo(velocity),
                    create_vbo(color)
                ], [
                    create_vbo(position),
                    create_vbo(velocity),
                    create_vbo(color)
                ]
            ];

            // matrix
            var mat = new matIV();
            var vMatrix   = mat.identity(mat.create());
            var pMatrix   = mat.identity(mat.create());
            var vpMatrix  = mat.identity(mat.create());
            mat.lookAt([0.0, 0.0, 3.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
            mat.perspective(60, canvasWidth / canvasHeight, 0.1, 10.0, pMatrix);
            mat.multiply(pMatrix, vMatrix, vpMatrix);

            // flags
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
            gl.disable(gl.RASTERIZER_DISCARD);

            // setting
            var startTime = Date.now();
            var nowTime = 0;
            var count = 0;
            run = true;
            render();

            function render(){
                nowTime = (Date.now() - startTime) / 1000;

                // mouse move power
                if(isMousedown !== true){
                    mouseMovePower *= 0.95;
                }

                // increment
                ++count;
                var countIndex = count % 2;
                var invertIndex = 1 - countIndex;

                // program
                gl.useProgram(prg);

                // set vbo
                set_attribute(VBOArray[countIndex], attLocation, attStride);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, VBOArray[invertIndex][0]);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, VBOArray[invertIndex][1]);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, VBOArray[invertIndex][2]);

                // begin transform feedback
                gl.enable(gl.RASTERIZER_DISCARD); // ラスタライズオフ
                gl.beginTransformFeedback(gl.POINTS); // Transform Object アクティブ化

                // vertex transform
                gl.uniform1f(uniLocation[0], nowTime);
                gl.uniform2fv(uniLocation[1], mousePosition);
                gl.uniform1f(uniLocation[2], mouseMovePower);
                gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight);

                // end transform feedback
                gl.disable(gl.RASTERIZER_DISCARD); // ラスタライズオン
                gl.endTransformFeedback(); // Transform Object 非アクティブ化
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
                gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, null);

                // clear
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clearDepth(1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.viewport(0, 0, canvasWidth, canvasHeight);

                // program
                gl.useProgram(fPrg);

                // set vbo
                set_attribute(VBOArray[invertIndex], fAttLocation, fAttStride);

                // push and render
                gl.uniformMatrix4fv(fUniLocation[0], false, vpMatrix);
                gl.uniform1f(fUniLocation[1], mouseMovePower);
                gl.drawArrays(gl.POINTS, 0, imageWidth * imageHeight);

                gl.flush();

                // animation loop
                if(run){requestAnimationFrame(render);}
            }
        }
    }, false);

    // utility functions ======================================================
    function create_shader(id){
        var shader;
        var scriptElement = document.getElementById(id);
        if(!scriptElement){return;}
        switch(scriptElement.type){
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return;
        }
        gl.shaderSource(shader, scriptElement.text);
        gl.compileShader(shader);
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            return shader;
        }else{
            alert(gl.getShaderInfoLog(shader));
        }
    }

    function create_program(vs, fs){
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            gl.useProgram(program);
            return program;
        }else{
            alert(gl.getProgramInfoLog(program));
        }
    }

    function create_program_tf_separate(vs, fs, varyings){
        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
        gl.linkProgram(program);
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            gl.useProgram(program);
            return program;
        }else{
            alert(gl.getProgramInfoLog(program));
        }
    }

    function create_vbo(data){
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    function create_vbo_feedback(data){
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_COPY);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    function set_attribute(vbo, attL, attS){
        for(var i in vbo){
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(attL[i]);
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    function set_attribute_base(vbo){
        for(var i in vbo){
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, vbo[i]);
        }
    }
})();
