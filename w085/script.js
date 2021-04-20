// sample_098
//
// WebGLで MRT を利用して同時エッジ検出

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
    var ext = gl.getExtension('WEBGL_draw_buffers');
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

    // MRT を行うシェーダ
    var v_shader = create_shader('mrt_vs');
    var f_shader = create_shader('mrt_fs');
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
    uniLocation[1] = gl.getUniformLocation(prg, 'ambient');

    // エッジ検出用シェーダ
    v_shader = create_shader('edge_vs');
    f_shader = create_shader('edge_fs');
    var ePrg = create_program(v_shader, f_shader);
    var eAttLocation = [];
    eAttLocation[0] = gl.getAttribLocation(ePrg, 'position');
    eAttLocation[1] = gl.getAttribLocation(ePrg, 'texCoord');
    var eAttStride = [];
    eAttStride[0] = 3;
    eAttStride[1] = 2;
    var eUniLocation = [];
    eUniLocation[0] = gl.getUniformLocation(ePrg, 'resolution');
    eUniLocation[1] = gl.getUniformLocation(ePrg, 'offsetCoord');
    eUniLocation[2] = gl.getUniformLocation(ePrg, 'weight');
    eUniLocation[3] = gl.getUniformLocation(ePrg, 'textureColor');
    eUniLocation[4] = gl.getUniformLocation(ePrg, 'textureDepth');
    eUniLocation[5] = gl.getUniformLocation(ePrg, 'textureNormal');

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

    // キューブモデル
    function cubeGenerate(side){
        var hs = side * 0.5;
        var pos = [
            -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,  hs,
            -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs, -hs,
            -hs,  hs, -hs, -hs,  hs,  hs,  hs,  hs,  hs,  hs,  hs, -hs,
            -hs, -hs, -hs,  hs, -hs, -hs,  hs, -hs,  hs, -hs, -hs,  hs,
             hs, -hs, -hs,  hs,  hs, -hs,  hs,  hs,  hs,  hs, -hs,  hs,
            -hs, -hs, -hs, -hs, -hs,  hs, -hs,  hs,  hs, -hs,  hs, -hs
        ];
        var nor = [
             0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,
             0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,
             0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,
             0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,
             1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0
        ];
        var col = [];
        for(var i = 0; i < pos.length / 3; i++){
            col.push(1.0, 1.0, 1.0, 1.0);
        }
        var idx = [
            0,  1,  2,  0,  2,  3,
            4,  5,  6,  4,  6,  7,
            8,  9, 10,  8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        return {p : pos, n : nor, c : col, i : idx};
    }
    var cubeData = cubeGenerate(1.0);
    var cPosition = create_vbo(cubeData.p);
    var cNormal   = create_vbo(cubeData.n);
    var cColor    = create_vbo(cubeData.c);
    var cVBOList  = [cPosition, cNormal, cColor];
    var cIndex    = create_ibo(cubeData.i);

    // 表示するキューブの個数
    var CUBE_COUNT = 100;

    // 各キューブのオフセット座標と拡縮率をランダムに決め格納
    var cubeOffset = [];
    var cubeScale = [];
    (function(){
        for(var i = 0; i < CUBE_COUNT; ++i){
            cubeOffset[i] = [
                Math.random() * 20.0 - 10.0,
                Math.random() * 20.0 - 10.0,
                Math.random() * 20.0 - 10.0
            ];
            cubeScale[i] = Math.random() + 0.5;
        }
    })();

    // 板ポリゴン
    var position = [
        -1.0,  1.0,  0.0,
         1.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0
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
        [-0.75, -0.75,  0.0],
        [-0.25,  -0.75,  0.0],
        [ 0.25, -0.75,  0.0]
    ];

    // カーネル参照のためのオフセット座標
    var offsetCoord = [
        -1.0, -1.0,
        -1.0,  0.0,
        -1.0,  1.0,
         0.0, -1.0,
         0.0,  0.0,
         0.0,  1.0,
         1.0, -1.0,
         1.0,  0.0,
         1.0,  1.0
    ];

    // ラプラシアンカーネル
    var weight = [
        -1.0, -1.0, -1.0,
        -1.0,  8.0, -1.0,
        -1.0, -1.0, -1.0
    ];

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
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);

    // フレームバッファを生成
    var bufferSize = 512;
    var frameBuffer = create_framebuffer_MRT(bufferSize, bufferSize);

    // テクスチャをバインドする
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[1]);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, frameBuffer.t[2]);

    // カウンタの宣言
    var count = 0;

    // 恒常ループ
    render();
    function render(){
        // カウンタをインクリメントする
        count++;

        // フレームバッファをバインド
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.f);

        // レンダリングターゲットの設定
        var bufferList = [
            ext.COLOR_ATTACHMENT0_WEBGL,
            ext.COLOR_ATTACHMENT1_WEBGL,
            ext.COLOR_ATTACHMENT2_WEBGL,
        ];
        ext.drawBuffersWEBGL(bufferList);

        // フレームバッファをクリア
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // プラグラムオブジェクトを選択
        gl.useProgram(prg);

        // ビュー×プロジェクション座標変換行列
        var eyePosition = [];
        var camUpDirection = [];
        q.toVecIII([0.0, 0.0, 25.0], qt, eyePosition);
        q.toVecIII([0.0, 1.0, 0.0], qt, camUpDirection);
        m.lookAt(eyePosition, [0, 0, 0], camUpDirection, vMatrix);
        m.perspective(60, c.width / c.height, 3.0, 50.0, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        // キューブをレンダリング
        set_attribute(cVBOList, attLocation, attStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIndex);
        for(var i = 0; i < CUBE_COUNT; ++i){
            var ambient = hsva(i * (360 / CUBE_COUNT), 1.0, 1.0, 1.0);
            m.identity(mMatrix);
            m.translate(mMatrix, cubeOffset[i], mMatrix);
            m.scale(mMatrix, [cubeScale[i], cubeScale[i], cubeScale[i]], mMatrix);
            m.multiply(tmpMatrix, mMatrix, mvpMatrix);
            gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
            gl.uniform4fv(uniLocation[1], ambient);
            gl.drawElements(gl.TRIANGLES, cubeData.i.length, gl.UNSIGNED_SHORT, 0);
        }

        // フレームバッファのバインドを解除
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // canvasをクリア
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // エッジ検出シェーダのプラグラムオブジェクトを選択
        gl.useProgram(ePrg);

        // 板ポリをレンダリング
        set_attribute(vVBOList, pAttLocation, pAttStride);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIndex);
        gl.uniform2fv(eUniLocation[0], [bufferSize, bufferSize]);
        gl.uniform2fv(eUniLocation[1], offsetCoord);
        gl.uniform1fv(eUniLocation[2], weight);
        gl.uniform1i(eUniLocation[3], 0);
        gl.uniform1i(eUniLocation[4], 1);
        gl.uniform1i(eUniLocation[5], 2);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

        // プラグラムオブジェクトを選択
        gl.useProgram(pPrg);

        // 板ポリをレンダリング
        for(i = 0; i < 3; ++i){
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
        for(var i = 0; i < 3; ++i){
            fTexture[i] = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, fTexture[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            // テクスチャパラメータ
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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
