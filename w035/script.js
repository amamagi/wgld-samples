onload = function(){
    var c = document.getElementById('canvas');
    c.width = 500;
    c.height = 300;
    var gl = c.getContext('webgl');

    var eCheck = document.getElementById('check');

    //gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

    var v_shader = create_shader('vs');
    var f_shader = create_shader('fs');
    var prg = create_program(v_shader, f_shader);

    var attLocation = new Array();
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'color');
    attLocation[2] = gl.getAttribLocation(prg, 'textureCoord');
    
    var attStride = new Array();
    attStride[0] = 3;
    attStride[1] = 4;
    attStride[2] = 2;

	var position = [
		-1.0,  1.0,  0.0,
		 1.0,  1.0,  0.0,
		-1.0, -1.0,  0.0,
		 1.0, -1.0,  0.0
	];
	var color = [
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0,
		1.0, 1.0, 1.0, 1.0
	];
	var textureCoord = [
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		1.0, 1.0
	];
	var index = [
		0, 1, 2,
		3, 2, 1
	];
	
    var pos_vbo = create_vbo(position);
    var col_vbo = create_vbo(color);
    var cood_vbo = create_vbo(textureCoord);
    set_attribute([pos_vbo, col_vbo, cood_vbo], attLocation, attStride);

    var ibo = create_ibo(index);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    var m = new matIV();
    var qMatrix = m.identity(m.create());
    var mMatrix = m.identity(m.create());
    var vMatrix = m.identity(m.create());
    var pMatrix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());
    var invMatrix = m.identity(m.create());
    
    var q = new qtnIV();
    var qt = q.identity(q.create());

    function mouseMove(e){
        var cw = c.width;
        var ch = c.height;
        var wh = 1 / Math.sqrt(cw * cw + ch * ch);

        // キャンバス中心を原点としたマウス座標を算出
        var x = e.clientX - c.offsetLeft - cw * 0.5;
        var y = e.clientY - c.offsetTop - ch * 0.5;

        // 原点からマウス座標が離れるほど大きくなるような回転角を算出
        var sq = Math.sqrt(x * x + y * y);
        var r = sq * 2.0 * Math.PI * wh;

        // 正規化
        if(sq != 1){
            sq = 1 / sq;
            x *= sq;
            y *= sq;
        }

        // 原点からマウス座標へのベクトルに直交するベクトルを軸とした回転
        q.rotate(r, [y, x, 0.0], qt);
    }

    c.addEventListener('mousemove', mouseMove, true);

	var camPosition = [0.0, 5.0, 10.0];
	var camUp = [0.0, 1.0, 0.0];
	
    // VP行列計算
    m.lookAt(camPosition, [0,0,0], camUp, vMatrix);
    m.perspective(45, c.width/c.height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    var ambientColor = [0.1, 0.1, 0.1, 1.0];
    
    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
    uniLocation[1] = gl.getUniformLocation(prg, 'texture');

    var texture0 = null
    var texture1 = null;

    create_texture('texture0.png', 0);
    create_texture('texture1.png', 1);
    
    var count = 0;

    (function(){
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        count++;
        var rad = (count % 360) * Math.PI / 180;
        
        /// Matrix
        q.toMatIV(qt, qMatrix);

        // V Mat
        m.lookAt(camPosition, [0, 0, 0], [0, 1, 0], vMatrix);

        // Billboard V Mat (V Matの逆向き)
        m.lookAt([0,0,0], camPosition, [0,1,0], invMatrix);

        // apply quaternion
        m.multiply(vMatrix, qMatrix, vMatrix);
        m.multiply(invMatrix, qMatrix, invMatrix);

        // Billboard V Mat の逆行列を取得 (カメラと逆の回転を得る)
        m.inverse(invMatrix, invMatrix);

        // VP行列
        m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        // Floor
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture1);
        gl.uniform1i(uniLocation[1], 1);
        
        // Set Floor M Mat
        m.identity(mMatrix);
        m.rotate(mMatrix, Math.PI / 2, [1,0,0], mMatrix);
        m.scale(mMatrix, [3.0,3.0,1.0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

        // Billboard
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture0);
        gl.uniform1i(uniLocation[1], 0);
        
        // Set Billboard M Mat
        m.identity(mMatrix);
        m.translate(mMatrix, [0.0, 1.0, 0.0], mMatrix);
        if(eCheck.checked){
            // look at camera
            m.multiply(mMatrix, invMatrix, mMatrix);
        }
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

        gl.flush();

        // 再帰呼び出し
        setTimeout(arguments.callee, 1000/30);
    })();
    
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
            default:
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
        }
    }
    
    function create_vbo(data){
        var vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    function create_ibo(data){
        var ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }
    
    function set_attribute(vbo, attL, attS){
        for(var i in vbo){
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(attL[i]);
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    // 断面の分割数、輪の分割数、パイプの半径、原点からパイプの中心までの距離
    function torus(row, column, irad, orad){
        var pos = new Array(), nor = new Array(), 
            col = new Array(), idx = new Array();
        for(var i = 0; i<=row; i++){
            var r = Math.PI * 2 / row * i;
            var rr = Math.cos(r);
            var ry = Math.sin(r);
            for(var ii = 0; ii <= column; ii++){
                var tr = Math.PI * 2 / column * ii;
                var tx = (rr * irad + orad) * Math.cos(tr);
                var ty = ry * irad;
                var tz = (rr * irad + orad) * Math.sin(tr);
                var rx = rr * Math.cos(tr);
                var rz = rr * Math.sin(tr);
                pos.push(tx, ty, tz);
                nor.push(rx, ry, rz);
                var tc = hsva(360 / column * ii, 1, 1, 1);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }
        for(i = 0; i < row; i++){
            for(ii = 0; ii < column; ii++){
                r = (column + 1) * i + ii;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r + 1);
            }
        }
        return {p:pos, n:nor,  c:col, i:idx};
    }

    function hsva(h, s, v, a){
        if(s > 1 || v > 1 || a > 1){return;}
        var th = h % 360;
        var i = Math.floor(th / 60);
        var f = th / 60 - i;
        var m = v * (1 - s);
        var n = v * (1 - s * f);
        var k = v * (1 - s * (1 - f));
        var color = new Array();
        if(!s > 0 && !s < 0){
            color.push(v, v, v, a); 
        } else {
            var r = new Array(v, n, m, m, k, v);
            var g = new Array(k, v, v, n, m, m);
            var b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }
        return color;
    }

    function create_texture(source, number){
        var img = new Image();
        img.onload = function(){
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            switch(number){
                case 0:
                    texture0 = tex;
                    break;
                case 1:
                    texture1 = tex;
                    break;
                default:
                    break;
            }
        };
        img.src = source;
    }
}