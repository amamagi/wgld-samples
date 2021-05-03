// sample_053
//
// WebGLでリムライティング

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
	var r = sq * 3.0 * Math.PI * wh;
	if(sq != 1){
		sq = 1 / sq;
		x *= sq;
		y *= sq;
	}
	q.rotate(r, [y, x, 0.0], qt);
}

onload = function(){
	// webgl用のcanvasエレメントを取得
	c = document.getElementById('canvas');
	c.width = 512;
	c.height = 512;
	
	// webglコンテキストを取得
	var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
	
	// エレメントへの参照を取得
	var eRange = document.getElementById('rimCoef');
	
	// イベント処理
	c.addEventListener('mousemove', mouseMove, true);
	
	// シーンをレンダリングするメインシェーダ
	var v_shader = create_shader('main_vs');
	var f_shader = create_shader('main_fs');
	var prg = create_program(v_shader, f_shader);
	var attLocation = new Array();
	attLocation[0] = gl.getAttribLocation(prg, 'position');
	attLocation[1] = gl.getAttribLocation(prg, 'normal');
	attLocation[2] = gl.getAttribLocation(prg, 'color');
	var attStride = new Array();
	attStride[0] = 3;
	attStride[1] = 3;
	attStride[2] = 4;
	var uniLocation = new Array();
	uniLocation[0] = gl.getUniformLocation(prg, 'mMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
	uniLocation[3] = gl.getUniformLocation(prg, 'lightDirection');
	uniLocation[4] = gl.getUniformLocation(prg, 'eyes');
	uniLocation[5] = gl.getUniformLocation(prg, 'eyePosition');
	uniLocation[6] = gl.getUniformLocation(prg, 'rimColor');
	uniLocation[7] = gl.getUniformLocation(prg, 'rimCoef');
	
	// レイをレンダリングするシェーダ
	v_shader = create_shader('ray_vs');
	f_shader = create_shader('main_fs');
	rPrg = create_program(v_shader, f_shader);
	var rAttLocation = new Array();
	rAttLocation[0] = gl.getAttribLocation(rPrg, 'position');
	rAttLocation[1] = gl.getAttribLocation(rPrg, 'color');
	var rAttStride = new Array();
	rAttStride[0] = 3;
	rAttStride[1] = 4;
	var rUniLocation = new Array();
	rUniLocation[0] = gl.getUniformLocation(rPrg, 'mvpMatrix');
	
	// トーラスモデル
	var torusData     = torus(64, 64, 0.25, 0.5);
	var tPosition     = create_vbo(torusData.p);
	var tNormal       = create_vbo(torusData.n);
	var tColor        = create_vbo(torusData.c);
	var tVBOList      = [tPosition, tNormal, tColor];
	var tIndex        = create_ibo(torusData.i);
	
	// 球体モデル
	var sphereData    = sphere(64, 64, 0.75);
	var sPosition     = create_vbo(sphereData.p);
	var sNormal       = create_vbo(sphereData.n);
	var sColor        = create_vbo(sphereData.c);
	var sVBOList      = [sPosition, sNormal, sColor];
	var sIndex        = create_ibo(sphereData.i);
	
	// レイ
	var position = [
		 0.0,  0.0, -2.0, // ライト方向の矢印
		 0.0,  0.0,  2.0, // "
		 0.1,  0.0,  1.9, // 矢印の先端
		 0.0,  0.0,  2.0, // "
		-0.1,  0.0,  1.9, // "
		 0.0,  0.0,  2.0, // "
		 0.0,  0.0,  0.0, // X
		 1.0,  0.0,  0.0, // "
		 0.0,  0.0,  0.0, // Y
		 0.0,  1.0,  0.0  // "
	];
	
	var color = [
		0.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		0.0, 0.0, 1.0, 1.0,
		1.0, 0.0, 0.0, 1.0,
		1.0, 0.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 1.0,
		0.0, 1.0, 0.0, 1.0
	];
	var rPosition = create_vbo(position);
	var rColor    = create_vbo(color);
	var rVBOList  = [rPosition, rColor];
	
	// 各種行列の生成と初期化
	var m = new matIV();
	var mMatrix    = m.identity(m.create());
	var vMatrix    = m.identity(m.create());
	var pMatrix    = m.identity(m.create());
	var tmpMatrix  = m.identity(m.create());
	var mvpMatrix  = m.identity(m.create());
	var invMatrix  = m.identity(m.create());
	
	// 深度テストとカリングを有効にする
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	
	// ライトの向き
	var lightDirection = [0.0, 0.0, -1.0];
	
	// カメラの注視点
	var eyes = [0.0, 0.0, 0.0];
	
	// リムライトの色
	var rimColor = [1.0, 1.0, 1.0, 1.0];
	
	// カウンタの宣言
	var count = 0;
	
	// 恒常ループ
	(function(){
		// カウンタをインクリメントする
		count++;
		
		// カウンタを元にラジアンを算出
		rad = (count % 360) * Math.PI / 180;
		
		// ビュー×プロジェクション座標変換行列
		var eyePosition = new Array();
		var camUpDirection = new Array();
		q.toVecIII([0.0, 1.0, 5.0], qt, eyePosition);
		q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
		m.lookAt(eyePosition, eyes, camUpDirection, vMatrix);
		m.perspective(45, c.width / c.height, 0.1, 10, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
		
		// -- トーラスをレンダリング --

		// canvasを初期化
		gl.clearColor(0.1, 0.1, 0.1, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// メインシェーダ用プログラムを選択
		gl.useProgram(prg);
		
		// エレメントからリムライトの係数を取得
		var rimCoef = eRange.value * 0.01;
		
		// トーラスのレンダリング
		set_attribute(tVBOList, attLocation, attStride);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
		m.identity(mMatrix);
		m.rotate(mMatrix, rad, [0.0, 1.0, 0.0], mMatrix);
		m.rotate(mMatrix, Math.PI * 0.5, [1.0, 0.0, 0.0], mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		m.inverse(mMatrix, invMatrix);
		gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
		gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
		gl.uniform3fv(uniLocation[3], lightDirection);
		gl.uniform3fv(uniLocation[4], eyes);
		gl.uniform3fv(uniLocation[5], eyePosition);
		gl.uniform4fv(uniLocation[6], rimColor);
		gl.uniform1f(uniLocation[7], rimCoef);
		gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
		
		// -- レイをレンダリング --

		// レイシェーダ用プログラムを選択
		gl.useProgram(rPrg);
		
		// レイのレンダリング
		set_attribute(rVBOList, rAttLocation, rAttStride);
		gl.uniformMatrix4fv(rUniLocation[0], false, tmpMatrix);
		// gl.drawArray(プリミティブ, 始点のインデックス, 描画する頂点数)
		gl.drawArrays(gl.LINES, 0, 2); // 0~1
		gl.drawArrays(gl.LINES, 2, 4); // 2~5
		gl.drawArrays(gl.LINES, 6, 2); // 6~7
		gl.drawArrays(gl.LINES, 8, 2); // 8~9
		
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
