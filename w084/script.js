// sample_097
//
// WebGLで MRT

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
	// MRTのステータス格納用
	var mrt_status = {
		color_attachments: 0,
		draw_buffers: 0
	};
	
	// canvasエレメントを取得
	c = document.getElementById('canvas');
	c.width = 512;
	c.height = 512;
	
	// イベント処理
	c.addEventListener('mousemove', mouseMove, true);
	
	// webglコンテキストを取得
	var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
	
	// 拡張機能を有効化する
	var ext = gl.getExtension('WEBGL_draw_buffers'); // <--------------------------------------------- Get Extension
	if(!ext){
		alert('WEBGL_draw_buffers not supported');
		return;
	}else{
		// アタッチできるテクスチャの数などを調べる
		mrt_status.color_attachments = gl.getParameter(ext.MAX_COLOR_ATTACHMENTS_WEBGL);
		mrt_status.draw_buffers = gl.getParameter(ext.MAX_DRAW_BUFFERS_WEBGL);
		console.log('MAX_COLOR_ATTACHMENTS_WEBGL: ' + mrt_status.color_attachments);
		console.log('MAX_DRAW_BUFFERS_WEBGL: ' + mrt_status.draw_buffers);
	}
	
	// ライティングを行うシェーダ
	var v_shader = create_shader('vs');
	var f_shader = create_shader('fs');
	var prg = create_program(v_shader, f_shader);
	var attLocation = [];
	attLocation[0] = gl.getAttribLocation(prg, 'position');
	attLocation[1] = gl.getAttribLocation(prg, 'normal');
	attLocation[2] = gl.getAttribLocation(prg, 'color');
	var attStride = [];
	attStride[0] = 3;
	attStride[1] = 3;
	attStride[2] = 4;
	var uniLocation = [];
	uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'invMatrix');
	uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');
	uniLocation[3] = gl.getUniformLocation(prg, 'ambient');
	
	// プレビュー用シェーダ
	v_shader = create_shader('preview_vs');
	f_shader = create_shader('preview_fs');
	var pPrg = create_program(v_shader, f_shader);
	var pAttLocation = [];
	pAttLocation[0] = gl.getAttribLocation(pPrg, 'position');
	pAttLocation[1] = gl.getAttribLocation(pPrg, 'texCoord');
	var pAttStride = [];
	pAttStride[0] = 3;
	pAttStride[1] = 2;
	var pUniLocation = [];
	pUniLocation[0] = gl.getUniformLocation(pPrg, 'offset');
	pUniLocation[1] = gl.getUniformLocation(pPrg, 'texture');
	
	// トーラスモデル
	var torusData     = torus(64, 64, 1.0, 2.0, [1.0, 1.0, 1.0, 1.0]);
	var tPosition     = create_vbo(torusData.p);
	var tNormal       = create_vbo(torusData.n);
	var tColor        = create_vbo(torusData.c);
	var tVBOList      = [tPosition, tNormal, tColor];
	var tIndex        = create_ibo(torusData.i);
	
	// 板ポリゴン
	var position = [
		-0.5,  0.5,  0.0,
		 0.5,  0.5,  0.0,
		-0.5, -0.5,  0.0,
		 0.5, -0.5,  0.0
	];
	var texCoord = [
		0.0, 1.0,
		1.0, 1.0,
		0.0, 0.0,
		1.0, 0.0
	];
	var index = [
		0, 2, 1,
		2, 3, 1
	];
	var vPosition = create_vbo(position);
	var vTexCoord = create_vbo(texCoord);
	var vVBOList = [vPosition, vTexCoord];
	var vIndex = create_ibo(index);
	
	// 板ポリゴンのオフセット移動量
	var offset = [
		[-0.5, -0.5,  0.0],
		[-0.5,  0.5,  0.0],
		[ 0.5, -0.5,  0.0],
		[ 0.5,  0.5,  0.0]
	];
	
	// 各種行列の生成と初期化
	var m = new matIV();
	var mMatrix   = m.identity(m.create());
	var vMatrix   = m.identity(m.create());
	var pMatrix   = m.identity(m.create());
	var tmpMatrix = m.identity(m.create());
	var mvpMatrix = m.identity(m.create());
	var invMatrix = m.identity(m.create());
	
	// 深度テストとカリングを有効にする
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	
	// 背景の初期化設定
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clearDepth(1.0);
	
	// ライトの向き
	var lightDirection = [-0.577, 0.577, 0.577];
	
	// フレームバッファを生成
	var bufferSize = 512;
	var frameBuffer = create_framebuffer_MRT(bufferSize, bufferSize); // <--------------------------------- MRT用フレームバッファの生成
	
	// テクスチャをバインドする
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[0]);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[1]);
	gl.activeTexture(gl.TEXTURE2);
	gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[2]);
	gl.activeTexture(gl.TEXTURE3);
	gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[3]);
	
	// カウンタの宣言
	var count = 0;
	
	// 恒常ループ
	render();
	function render(){
		// カウンタをインクリメントする
		count++;
		
		// カウンタを元にラジアンを算出
		var rad = (count % 360) * Math.PI / 180;

		// -- MRT レンダリング --
		
		// フレームバッファをバインド
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.f);
		
		// レンダリングターゲットの設定 <------------------------------------------------------- ここの順番が gl_FragData に反映される
		var bufferList = [
			ext.COLOR_ATTACHMENT0_WEBGL,
			ext.COLOR_ATTACHMENT1_WEBGL,
			ext.COLOR_ATTACHMENT2_WEBGL,
			ext.COLOR_ATTACHMENT3_WEBGL
		];
		ext.drawBuffersWEBGL(bufferList);
		
		// フレームバッファをクリア
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// プラグラムオブジェクトを選択
		gl.useProgram(prg);
		
		// ビュー×プロジェクション座標変換行列
		var eyePosition = [];
		var camUpDirection = [];
		q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
		q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
		m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
		m.perspective(75, c.width / c.height, 5.0, 35.0, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
		
		// トーラスをレンダリング
		set_attribute(tVBOList, attLocation, attStride);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
		gl.uniform3fv(uniLocation[2], lightDirection);
		for(var i = 0; i < 9; i++){
			var ambient = hsva(i * 40, 1.0, 1.0, 1.0);
			m.identity(mMatrix);
			m.rotate(mMatrix, i * 2 * Math.PI / 9, [0, 1, 0], mMatrix);
			m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
			m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
			m.multiply(tmpMatrix, mMatrix, mvpMatrix);
			m.inverse(mMatrix, invMatrix);
			gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
			gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
			gl.uniform4fv(uniLocation[3], ambient);
			gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
		}
		
		// フレームバッファのバインドを解除
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// -- MRT を可視化 --
		
		// canvasをクリア
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// プラグラムオブジェクトを選択
		gl.useProgram(pPrg);
		
		// 板ポリをレンダリング
		set_attribute(vVBOList, pAttLocation, pAttStride);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
		for(i = 0; i < 4; ++i){
			gl.uniform3fv(pUniLocation[0], offset[i]);
			gl.uniform1i(pUniLocation[1], i);
			gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
		}
		
		// コンテキストの再描画
		gl.flush();
		
		// ループのために再帰呼び出し
		requestAnimationFrame(render);
	}
	
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
	// フレームバッファをオブジェクトとして生成する関数(MRT仕様)
	function create_framebuffer_MRT(width, height) {
		// フレームバッファの生成
		var frameBuffer = gl.createFramebuffer();
		
		// フレームバッファをWebGLにバインド
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		
		// フレームバッファ用テクスチャを格納する配列
		var fTexture = [];
		
		// ループ処理でテクスチャを初期化
		for(var i = 0; i < 4; ++i){
			fTexture[i] = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, fTexture[i]);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			
			// テクスチャパラメータ
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			
			// フレームバッファにテクスチャを関連付ける
			gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.COLOR_ATTACHMENT0_WEBGL + i, gl.TEXTURE_2D, fTexture[i], 0);
		}
		
		// 深度バッファ用レンダーバッファ
		var depthRenderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
		
		// 各種オブジェクトのバインドを解除
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		// オブジェクトを返して終了
		return {
			f: frameBuffer,
			d: depthRenderBuffer,
			t: fTexture
		};
	}
};
