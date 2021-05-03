// sample_100
//
// WebGLでフラットシェーディング

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

    // 拡張機能を有効化する
    if(!gl.getExtension('OES_standard_derivatives')){
        console.log('OES_standard_derivatives is not supported');
        return;
    }

    // シェーダの準備と各種ロケーションの取得
    var v_shader = create_shader('vs');
    var f_shader = create_shader('fs');
    var prg = create_program(v_shader, f_shader);
    var attLocation = [];
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'color');
    var attStride = [];
    attStride[0] = 3;
    attStride[1] = 4;
    var uniLocation = [];
    uniLocation[0] = gl.getUniformLocation(prg, 'mMatrix');
    uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
    uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');

    // 球体モデル
    var sphereData    = sphere(8, 8, 5.0, [1.0, 1.0, 1.0, 1.0]);
    var sPosition     = create_vbo(sphereData.p);
    var sColor        = create_vbo(sphereData.c);
    var sVBOList      = [sPosition, sColor];
    var sIndex        = create_ibo(sphereData.i);

    // トーラスモデル
    var torusData     = torus(8, 16, 1.7, 2.0, [1.0, 1.0, 1.0, 1.0]);
    var tPosition     = create_vbo(torusData.p);
    var tColor        = create_vbo(torusData.c);
    var tVBOList      = [tPosition, tColor];
    var tIndex        = create_ibo(torusData.i);

    // 各種行列の生成と初期化
    var m = new matIV();
    var mMatrix   = m.identity(m.create());
    var vMatrix   = m.identity(m.create());
    var pMatrix   = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());

    // 深度テストとカリングを有効にする
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    // 背景の初期化設定
    gl.clearColor(0.3, 0.7, 0.7, 1.0);
    gl.clearDepth(1.0);

    // ライトの向き
    var lightDirection = [-0.5, 1.0, 2.0];

    // カウンタの宣言
    var count = 0;
    render();

    // 恒常ループ
    function render(){
        // カウンタをインクリメントする
        count++;

        // カウンタを元にラジアンを算出
        var rad = (count % 360) * Math.PI / 180;

        // canvasをクリア
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // ビュー×プロジェクション座標変換行列
        var eyePosition = [];
        var camUpDirection = [];
        q.toVecIII([0.0, 20.0, 0.0], qt, eyePosition);
        q.toVecIII([0.0, 0.0, -1.0], qt, camUpDirection);
        m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
        m.perspective(90, c.width / c.height, 0.1, 50.0, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        // 球体をレンダリング
        set_attribute(sVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
        gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
        gl.uniform3fv(uniLocation[2], lightDirection);
        gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

        // トーラスをレンダリング
        set_attribute(tVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
        for(var i = 0; i < 9; i++){
            m.identity(mMatrix);
            m.rotate(mMatrix, i * 2 * Math.PI / 9, [0, 1, 0], mMatrix);
            m.translate(mMatrix, [0.0, 0.0, 10.0], mMatrix);
            m.rotate(mMatrix, rad, [1, 1, 0], mMatrix);
            m.multiply(tmpMatrix, mMatrix, mvpMatrix);
            gl.uniformMatrix4fv(uniLocation[0], false, mMatrix);
            gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
            gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);
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
};
