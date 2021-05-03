// sample_102
//
// WebGLでMatcap

// canvas と行列・クォータニオンをグローバルに扱う
var c;
var m = new matIV();
var q = new qtnIV();
var qt = q.identity(q.create());
var run = true;

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

window.addEventListener('load', function(){
    // カウンタの宣言
    var count = 0;

    // canvasエレメントを取得
    c = document.getElementById('canvas');
    c.width = 512;
    c.height = 512;

    // イベント処理
    c.addEventListener('mousemove', mouseMove, true);
    window.addEventListener('keydown', function(eve){
        run = eve.keyCode !== 27;
    }, false);

    // select エレメント
    var sel = document.getElementById('select');
    sel.selectedIndex = 0;

    // webglコンテキストを取得
    var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    // テクスチャ関連
    var textures = [];
    (function(){
        var i;
        for(i = 0; i < 8; ++i){
            create_texture('./image/matcap' + i + '.png', i);
        }
        setTimeout(loadCheck, 100);
        // テクスチャのロードチェック
        function loadCheck(){
            var j;
            var f = true;
            for(j = 0; j < 8; ++j){
                f = f && (textures[j]);
            }
            if(f){
                init();
            }else{
                setTimeout(loadCheck, 100);
            }
        }
    })();

    // WebGL関連の初期化処理
    function init(){
        // シェーダの準備と各種ロケーションの取得
        var v_shader = create_shader('vs');
        var f_shader = create_shader('fs');
        var prg = create_program(v_shader, f_shader);
        var attLocation = [];
        attLocation[0] = gl.getAttribLocation(prg, 'position');
        attLocation[1] = gl.getAttribLocation(prg, 'normal');
        var attStride = [];
        attStride[0] = 3;
        attStride[1] = 3;
        var uniLocation = [];
        uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
        uniLocation[1] = gl.getUniformLocation(prg, 'normalMatrix');
        uniLocation[2] = gl.getUniformLocation(prg, 'texture');

        // 球体モデル
        var sphereData    = sphere(32, 32, 1.0);
        var sPosition     = create_vbo(sphereData.p);
        var sNormal       = create_vbo(sphereData.n);
        var sVBOList      = [sPosition, sNormal];
        var sIndex        = create_ibo(sphereData.i);

        // トーラスモデル
        var torusData     = torus(64, 64, 0.7, 2.0);
        var tPosition     = create_vbo(torusData.p);
        var tNormal       = create_vbo(torusData.n);
        var tVBOList      = [tPosition, tNormal];
        var tIndex        = create_ibo(torusData.i);

        // 各種行列の生成と初期化
        var mMatrix = m.identity(m.create());
        var vMatrix = m.identity(m.create());
        var pMatrix = m.identity(m.create());
        var tmpMatrix = m.identity(m.create());
        var mvMatrix = m.identity(m.create());
        var mvpMatrix = m.identity(m.create());
        var invMatrix = m.identity(m.create());
        var normalMatrix = m.identity(m.create());

        // 深度テストとカリングを有効にする
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);

        // 背景の初期化設定
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clearDepth(1.0);

        render();

        // 恒常ループ
        function render(){
            var i;

            // カウンタをインクリメントする
            count++;

            // カウンタを元にラジアンを算出
            var rad = (count % 360) * Math.PI / 180;

            // select エレメントの値を取得
            var selValue = parseInt(sel.value, 10);

            // 取得した値からテクスチャバインドを選択
            gl.bindTexture(gl.TEXTURE_2D, textures[selValue]);

            // canvasをクリア
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // ビュー×プロジェクション座標変換行列
            var eyePosition = [];
            var centerPoint = [0.0, 0.0, 0.0];
            var camUpDirection = [];
            q.toVecIII([0.0, 0.0, 10.0], qt, eyePosition);
            q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
            m.lookAt(eyePosition, centerPoint, camUpDirection, vMatrix);
            m.perspective(45, c.width / c.height, 0.1, 20.0, pMatrix);
            m.multiply(pMatrix, vMatrix, tmpMatrix);

            // 球体をレンダリング
            set_attribute(sVBOList, attLocation, attStride);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sIndex);
            m.identity(mMatrix);
            m.translate(mMatrix, [0.0, Math.sin(rad), 0.0], mMatrix);
            m.rotate(mMatrix, rad, [1.0, 1.0, 0.0], mMatrix);
            m.multiply(tmpMatrix, mMatrix, mvpMatrix);

            // 法線変換マトリックスの生成
            m.multiply(vMatrix, mMatrix, mvMatrix);
            m.inverse(mvMatrix, invMatrix);
            m.transpose(invMatrix, normalMatrix);

            gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
            gl.uniformMatrix4fv(uniLocation[1], false, normalMatrix);
            gl.uniform1i(uniLocation[2], 0);
            gl.drawElements(gl.TRIANGLES, sphereData.i.length, gl.UNSIGNED_SHORT, 0);

            // トーラスをレンダリング
            set_attribute(tVBOList, attLocation, attStride);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndex);
            gl.drawElements(gl.TRIANGLES, torusData.i.length, gl.UNSIGNED_SHORT, 0);

            // コンテキストの再描画
            gl.flush();

            // ループのために再帰呼び出し
            if(run){requestAnimationFrame(render);}
        }
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

    // テクスチャを生成する関数
    function create_texture(source, number){
        // イメージオブジェクトの生成
        var img = new Image();

        // データのオンロードをトリガーにする
        img.onload = function(){
            // テクスチャオブジェクトの生成
            var tex = gl.createTexture();

            // テクスチャをバインドする
            gl.bindTexture(gl.TEXTURE_2D, tex);

            // テクスチャへイメージを適用
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

            // テクスチャパラメータ
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // ミップマップを生成
            gl.generateMipmap(gl.TEXTURE_2D);

            // テクスチャのバインドを無効化
            gl.bindTexture(gl.TEXTURE_2D, null);

            // 生成したテクスチャを変数に代入
            textures[number] = tex;
        };
        img.src = source;
    }
}, false);
