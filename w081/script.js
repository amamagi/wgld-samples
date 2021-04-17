// sample_094
//
// WebGLでVBOを逐次更新しながら描画する

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
	
	// エレメントへの参照を取得
	var ePointSize = document.getElementById('point_size');
	
	// イベント処理
	c.addEventListener('mousemove', mouseMove, true);
	
	// webglコンテキストを取得
	var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
	
	// 頂点シェーダとフラグメントシェーダの生成
	var v_shader = create_shader('vs');
	var f_shader = create_shader('fs');
	
	// プログラムオブジェクトの生成とリンク
	var prg = create_program(v_shader, f_shader);
	
	// attributeLocationを配列に取得
	var attLocation = new Array();
	attLocation[0] = gl.getAttribLocation(prg, 'position');
	
	// VBO生成
	var pointSphere = sphere(64, 64, 1.0);
	var pointPosition = new Float32Array(pointSphere.p);
	var vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.enableVertexAttribArray(attLocation[0]);
	gl.vertexAttribPointer(attLocation[0], 3.0, gl.FLOAT, false, 0, 0);
	gl.bufferData(gl.ARRAY_BUFFER, pointPosition, gl.DYNAMIC_DRAW);
	
	// uniformLocationを配列に取得
	var uniLocation = new Array();
	uniLocation[0]  = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[1]  = gl.getUniformLocation(prg, 'pointSize');
	
	// 各種行列の生成と初期化
	var m = new matIV();
	var mMatrix   = m.identity(m.create());
	var vMatrix   = m.identity(m.create());
	var pMatrix   = m.identity(m.create());
	var tmpMatrix = m.identity(m.create());
	var mvpMatrix = m.identity(m.create());
	var qMatrix   = m.identity(m.create());
	
	// 各種フラグを有効化する
	gl.enable(gl.BLEND);
	
	// ブレンドファクター
	gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
	
	// カウンタ
	var count = 0;
	
	// 恒常ループ
	(function render(){
		// canvasを初期化
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		// カウンタからラジアンを算出
		count += 3;
		var rad = (count % 360) * Math.PI / 180;
		
		// クォータニオンを行列に適用
		var qMatrix = m.identity(m.create());
		q.toMatIV(qt, qMatrix);
		
		// ビュー×プロジェクション座標変換行列
		var camPosition = [0.0, 0.0, 5.0];
		m.lookAt(camPosition, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0], vMatrix);
		m.multiply(vMatrix, qMatrix, vMatrix);
		m.perspective(45, c.width / c.height, 0.1, 15.0, pMatrix);
		m.multiply(pMatrix, vMatrix, tmpMatrix);
		
		// 点のサイズをエレメントから取得
		var pointSize = ePointSize.value / 10;
		
		// 点を更新
		for(var i = 0, j = pointPosition.length; i < j; i += 3){
			var t = Math.cos(rad);
			var x = pointSphere.p[i] + pointSphere.p[i] * Math.cos(rad);
			var y = pointSphere.p[i + 1] + pointSphere.p[i + 1] * Math.sin(rad);
			pointPosition[i]     = x;
			pointPosition[i + 1] = y;
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointPosition);
		
		// 点を描画
		m.identity(mMatrix);
		m.multiply(tmpMatrix, mMatrix, mvpMatrix);
		gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
		gl.uniform1f(uniLocation[1], pointSize);
		gl.drawArrays(gl.POINTS, 0, pointPosition.length / 3);
		
		// コンテキストの再描画
		gl.flush();
		
		// ループのために再帰呼び出し
		requestAnimationFrame(render);
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
};
