// sample_066
//
// WebGLでVAO(Vertex Array Object)を使う

// canvas とクォータニオンをグローバルに扱う
var c;
var q = new qtnIV();
var qt = q.identity(q.create());

// マウスムーブイベントに登録する処理
function mouseMove(e){
	var cw = c.width;
	var ch = c.height;
	var wh = 1 / Math.sqrt(cw * cw + ch * ch);
	var x = e.clientX - c.offsetLeft - cw * 0.5;
	var y = e.clientY - c.offsetTop - ch * 0.5;
	var sq = Math.sqrt(x * x + y * y);
	var r = sq * 2.0 * Math.PI * wh;
	if(sq != 1){
		sq = 1 / sq;
		x *= sq;
		y *= sq;
	}
	q.rotate(r, [y, x, 0.0], qt);
}

onload = function(){
	// canvasエレメントを取得
	c = document.getElementById('canvas');
	c.width = 512;
	c.height = 512;
	
	// イベント処理
	c.addEventListener('mousemove', mouseMove, true);
	
	// webglコンテキストを取得
	var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
	
	// シェーダ
	var v_shader = create_shader('vs');
	var f_shader = create_shader('fs');
	var prg = create_program(v_shader, f_shader);
	
	// uniform
	var uniLocation = new Array();
	uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'mMatrix');
	uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
	uniLocation[3] = gl.getUniformLocation(prg, 'lightPosition');
	uniLocation[4] = gl.getUniformLocation(prg, 'eyePosition');
	uniLocation[5] = gl.getUniformLocation(prg, 'ambientColor');
	
	// attribute
	var attLocation = new Array();
	attLocation[0] = gl.getAttribLocation(prg, 'position');
	attLocation[1] = gl.getAttribLocation(prg, 'normal');
	attLocation[2] = gl.getAttribLocation(prg, 'color');
	var attStride = new Array();
	attStride[0] = 3;
	attStride[1] = 3;
	attStride[2] = 4;
	
	// トーラス
	var torusData = torus(64, 64, 1.0, 3.0, [0.25, 0.75, 0.25, 1.0]);
	var tPosition = create_vbo(torusData.p);
	var tNormal   = create_vbo(torusData.n);
	var tColor    = create_vbo(torusData.c);
	var tVBOList  = [tPosition, tNormal, tColor];
	var tIndex = create_ibo(torusData.i);
	
	// 球体
	var sphereData = sphere(64, 64, 4.0, [0.75, 0.25, 0.75, 1.0]);
	var sPosition = create_vbo(sphereData.p);
	var sNormal   = create_vbo(sphereData.n);
	var sColor    = create_vbo(sphereData.c);
	var sVBOList  = [sPosition, sNormal, sColor];
	var sIndex = create_ibo(sphereData.i);
	
	// 拡張機能を有効化
	var ext;
	ext = gl.getExtension('OES_vertex_array_object'); //<---------------------------------------------------------GET EXTENSIOS
	if(ext == null){
		alert('vertex array object not supported');
		return;
	}

	// -- VAOにVBOとIBOをバインド --
	
	// VAO を生成してバインドする(トーラス)
	var torusVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(torusVAO);
	
	// VAO に VBO と IBO を登録する(トーラス)
	set_attribute(tVBOList, attLocation, attStride);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
	
	// VAO を生成してバインドする(球体)
	var sphereVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(sphereVAO);
	
	// VAO に VBO と IBO を登録する(球体)
	set_attribute(sVBOList, attLocation, attStride);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
	
	// VAO のバインドを解除
	ext.bindVertexArrayOES(null);

	// -- 初期化 --
	
	// 各種行列
	var m = new matIV();
	var mMatrix = m.identity(m.create());
	var vMatrix = m.identity(m.create());
	var pMatrix = m.identity(m.create());
	var tmpMatrix = m.identity(m.create());
	var mvpMatrix = m.identity(m.create());
	var invMatrix = m.identity(m.create());
	
	// 点光源の位置
	var lightPosition = [0.0, 0.0, 0.0];
	
	// 環境光の色
	var ambientColor = [0.1, 0.1, 0.1, 1.0];
	
	// カウンタの宣言
	var count = 0;
	
	// 諸設定
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	
	// 恒常ループ
	(function(){
		// canvasを初期化
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// カウンタをインクリメントする
		count++;
		
		// カウンタを元にラジアンと各種座標を算出
		var rad = (count % 360) * Math.PI / 180;
		var tx = Math.cos(rad) * 7.0;
		var ty = Math.sin(rad) * 7.0;
		var tz = Math.sin(rad) * 7.0;
		
		// ビュー×プロジェクション座標変換行列
		var eyePosition = new Array();
		var camUpDirection = new Array();
		q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
		q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
		m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
		m.perspective(90, c.width / c.height, 0.1, 40.0, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
		
		// VAO をバインドする
		ext.bindVertexArrayOES(torusVAO); // <----------------------------------------------------------- BIND VAO
		
		// モデル座標変換行列の生成
		m.identity(mMatrix);
		m.translate(mMatrix, [-tx, ty, tz], mMatrix);
		m.rotate(mMatrix, -rad, [0, 1, 1], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		m.inverse(mMatrix, invMatrix);
		
		// uniform変数の登録と描画
		gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[1], false, mMatrix);
		gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
		gl.uniform3fv(uniLocation[3], lightPosition);
		gl.uniform3fv(uniLocation[4], eyePosition);
		gl.uniform4fv(uniLocation[5], ambientColor);
		gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
		
		// VAO をバインドする
		ext.bindVertexArrayOES(sphereVAO); // <----------------------------------------------------------- BIND VAO
		
		// モデル座標変換行列の生成
		m.identity(mMatrix);
		m.translate(mMatrix, [tx, -ty, -tz], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		m.inverse(mMatrix, invMatrix);
		
		// uniform変数の登録と描画
		gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[1], false, mMatrix);
		gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
		gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);
		
		// コンテキストの再描画
		gl.flush();
		
		// ループのために再帰呼び出し
		setTimeout(arguments.callee, 1000 / 30);
	})();
	
	// シェーダを生成する関数
	function create_shader(id){
		// シェーダを格納する変数
		var shader;
		
		// HTMLからscriptタグへの参照を取得
		var scriptElement = document.getElementById(id);
		
		// scriptタグが存在しない場合は抜ける
		if(!scriptElement){return;}
		
		// scriptタグのtype属性をチェック
		switch(scriptElement.type){
			
			// 頂点シェーダの場合
			case 'x-shader/x-vertex':
				shader = gl.createShader(gl.VERTEX_SHADER);
				break;
				
			// フラグメントシェーダの場合
			case 'x-shader/x-fragment':
				shader = gl.createShader(gl.FRAGMENT_SHADER);
				break;
			default :
				return;
		}
		
		// 生成されたシェーダにソースを割り当てる
		gl.shaderSource(shader, scriptElement.text);
		
		// シェーダをコンパイルする
		gl.compileShader(shader);
		
		// シェーダが正しくコンパイルされたかチェック
		if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			
			// 成功していたらシェーダを返して終了
			return shader;
		}else{
			
			// 失敗していたらエラーログをアラートする
			alert(gl.getShaderInfoLog(shader));
		}
	}
	
	// プログラムオブジェクトを生成しシェーダをリンクする関数
	function create_program(vs, fs){
		// プログラムオブジェクトの生成
		var program = gl.createProgram();
		
		// プログラムオブジェクトにシェーダを割り当てる
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		
		// シェーダをリンク
		gl.linkProgram(program);
		
		// シェーダのリンクが正しく行なわれたかチェック
		if(gl.getProgramParameter(program, gl.LINK_STATUS)){
		
			// 成功していたらプログラムオブジェクトを有効にする
			gl.useProgram(program);
			
			// プログラムオブジェクトを返して終了
			return program;
		}else{
			
			// 失敗していたらエラーログをアラートする
			alert(gl.getProgramInfoLog(program));
		}
	}
	
	// VBOを生成する関数
	function create_vbo(data){
		// バッファオブジェクトの生成
		var vbo = gl.createBuffer();
		
		// バッファをバインドする
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		
		// バッファにデータをセット
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
		
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		
		// 生成した VBO を返して終了
		return vbo;
	}
	
	// VBOをバインドし登録する関数
	function set_attribute(vbo, attL, attS){
		// 引数として受け取った配列を処理する
		for(var i in vbo){
			// バッファをバインドする
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
			
			// attributeLocationを有効にする
			gl.enableVertexAttribArray(attL[i]);
			
			// attributeLocationを通知し登録する
			gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
		}
	}
	
	// IBOを生成する関数
	function create_ibo(data){
		// バッファオブジェクトの生成
		var ibo = gl.createBuffer();
		
		// バッファをバインドする
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		
		// バッファにデータをセット
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
		
		// バッファのバインドを無効化
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		
		// 生成したIBOを返して終了
		return ibo;
	}
	
};