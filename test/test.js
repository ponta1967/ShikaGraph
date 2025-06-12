// モンキーパッチ部分（ファイルの先頭に配置）
(function() {
    console.log('簡易モンキーパッチを適用します');
    
    // オリジナルのgetElementByIdを保存
    var originalGetElementById = document.getElementById;
    
    // 安全なgetElementById関数を上書き
    document.getElementById = function(id) {
        // オリジナルの関数を呼び出す
        var element = originalGetElementById.call(document, id);
        
        // save-image要素が存在しない場合のみ
        if (id === 'save-image' && !element) {
            console.log('save-image要素の代替作成');
            
            // 単純なダミー要素を作成
            var dummy = document.createElement('button');
            dummy.id = 'save-image';
            dummy.style.display = 'none';
            
            // イベントリスナーメソッドを上書き
            dummy.addEventListener = function() { 
                return true; 
            };
            
            return dummy;
        }
        
        return element;
    };
    
    console.log('簡易モンキーパッチ適用完了');
})();

// ShikaGraph Fabric.js テスト用スクリプト

// グローバル変数
let canvas;
let isDrawingMode = false;
let currentColor = '#FF0000'; // 赤色をデフォルト
let currentWidth = 3; // 中太をデフォルト

// FileMaker連携用
let fmCallbackFunction = 'ShikaGraphCallback';

// ポインターイベント関連の変数
let isPointerDown = false;
let lastPointerPosition = { x: 0, y: 0 };
let pointerType = 'mouse'; // 'mouse', 'touch', 'pen'
let pointerDebugMode = false; // デバッグモード用フラグ

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
    // iOS WebView用のタッチイベント調整
    document.addEventListener('touchmove', function(e) {
        if (e.scale !== 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    initApp();
});

// DOM要素の安全な取得とイベントリスナー設定
function safeAddEventListener(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
        return true;
    }
    return false;
}

// アプリケーション初期化
function initApp() {
    try {
        // Canvas要素を初期化
        const canvasEl = document.getElementById('test-canvas');
        if (!canvasEl) {
            throw new Error('キャンバス要素が見つかりません');
        }
        
        const container = document.getElementById('canvas-container');
        if (!container) {
            throw new Error('キャンバスコンテナが見つかりません');
        }
        
        // コンテナの実際のサイズを取得
        const containerRect = container.getBoundingClientRect();
        
        // Canvasサイズをコンテナに合わせる
        canvasEl.width = containerRect.width;
        canvasEl.height = containerRect.height;
        
        // Fabric.jsキャンバスを初期化
        canvas = new fabric.Canvas('test-canvas', {
            isDrawingMode: false,
            selection: true,
            backgroundColor: '#FFFFFF'
        });
        
        // iOS用の設定追加
        canvas.allowTouchScrolling = false;
        
        // ブラシの設定 - freeDrawingBrushの存在確認と初期化
        if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = currentWidth;
        
        // イベントリスナーの設定
        setupEventListeners();
        
        // ポインターイベントリスナーの設定（新規追加）
        setupPointerEventListeners();
        
        // 初期化成功メッセージ
        updateStatus('Fabric.js v' + fabric.version + ' テスト環境初期化完了');
        
        // ウィンドウリサイズ対応
        window.addEventListener('resize', resizeCanvas);
        
        // FileMakerからの呼び出しを受け取るためのグローバル関数を定義
        window.ShikaGraphFromFM = function(action, data) {
            handleFileMakerCall(action, data);
        };
        
    } catch (error) {
        updateStatus('初期化エラー: ' + error.message, true);
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // 描画モードボタン
    safeAddEventListener('draw-mode', 'click', function() {
        setDrawingMode(true);
    });
    
    // 選択モードボタン
    safeAddEventListener('select-mode', 'click', function() {
        setDrawingMode(false);
    });
    
    // テキスト追加ボタン
    safeAddEventListener('add-text', 'click', function() {
        addText('サンプルテキスト');
    });
    
    // スタンプ追加ボタン
    safeAddEventListener('add-stamp', 'click', function() {
        addStamp();
    });
    
    // 全消去ボタン
    safeAddEventListener('clear-canvas', 'click', function() {
        clearCanvas();
    });
    
    // JSON保存ボタン
    safeAddEventListener('save-json', 'click', function() {
        saveAsJSON();
    });
    
    // JSON読込ボタン
    safeAddEventListener('load-json', 'click', function() {
        loadFromJSON();
    });
    
    // FileMaker送信ボタン
    safeAddEventListener('to-fm', 'click', function() {
        sendToFileMaker();
    });
    
    // FileMaker取得ボタン
    safeAddEventListener('from-fm', 'click', function() {
        getFromFileMaker();
    });
    
    // 画像保存ボタン (存在する場合のみ)
    safeAddEventListener('save-image', 'click', function() {
        saveAsImage();
    });
    
    // キャンバスの描画完了イベント
    canvas.on('path:created', function() {
        updateStatus('パス描画完了');
    });
    
    // オブジェクト選択イベント
    canvas.on('selection:created', function(e) {
        updateStatus('オブジェクト選択: ' + e.selected.length + '個');
    });
    
    // オブジェクト選択解除イベント
    canvas.on('selection:cleared', function() {
        updateStatus('選択解除');
    });
    
    // オブジェクト移動イベント
    canvas.on('object:modified', function() {
        updateStatus('オブジェクト修正完了');
    });
    
    // デバッグトグルボタン（新規追加）
    safeAddEventListener('toggle-debug', 'click', function() {
        pointerDebugMode = !pointerDebugMode;
        updateStatus('デバッグモード: ' + (pointerDebugMode ? 'オン' : 'オフ'));
    });
}

// ポインターイベントリスナーの設定（新規追加）
function setupPointerEventListeners() {
    // キャンバス要素の取得
    const canvasEl = document.getElementById('test-canvas');
    if (!canvasEl) {
        updateStatus('キャンバス要素が見つからないためポインターイベントを設定できません', true);
        return;
    }
    
    // Fabric.jsが作成するupper-canvasを取得（実際の描画操作はこちらで行われる）
    const upperCanvas = document.querySelector('.upper-canvas');
    
    // ポインターイベントの対象要素（upperCanvas がFabric.jsの操作レイヤー）
    const targetElement = upperCanvas || canvasEl;
    
    // タッチアクションの設定（iOS Safari用）
    targetElement.style.touchAction = 'none';
    
    // ポインターイベントリスナーの追加
    targetElement.addEventListener('pointerdown', handlePointerDown);
    targetElement.addEventListener('pointermove', handlePointerMove);
    targetElement.addEventListener('pointerup', handlePointerUp);
    targetElement.addEventListener('pointercancel', handlePointerCancel);
    
    // iOS Safari向けの特別対応
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        // タッチ遅延の排除
        targetElement.style.webkitTapHighlightColor = 'rgba(0,0,0,0)';
        // スクロール防止
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }
    
    updateStatus('ポインターイベントリスナー設定完了');
}

// ポインターダウンイベントハンドラー（新規追加）
function handlePointerDown(e) {
    // イベント情報のデバッグ表示
    if (pointerDebugMode) {
        updateStatus(`PointerDown: type=${e.pointerType}, id=${e.pointerId}, button=${e.button}`);
    }
    
    // ポインタータイプの保存
    pointerType = e.pointerType; // 'mouse', 'touch', 'pen'
    
    // ポインターの状態を更新
    isPointerDown = true;
    
    // 現在位置を保存
    const rect = e.target.getBoundingClientRect();
    lastPointerPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    // キャプチャの設定（ポインターが要素外に移動しても追跡するため）
    e.target.setPointerCapture(e.pointerId);
    
    // iOS向けの特別処理
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        // iOS WebViewでの問題を防ぐための追加処理
        e.preventDefault();
    }
}

// ポインタームーブイベントハンドラー（新規追加）
function handlePointerMove(e) {
    if (!isPointerDown) return;
    
    // イベント情報のデバッグ表示
    if (pointerDebugMode) {
        updateStatus(`PointerMove: type=${e.pointerType}, id=${e.pointerId}, pressure=${e.pressure.toFixed(2)}`);
    }
    
    // 現在位置を計算
    const rect = e.target.getBoundingClientRect();
    const currentPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    // 位置の差分を計算
    const dx = currentPosition.x - lastPointerPosition.x;
    const dy = currentPosition.y - lastPointerPosition.y;
    
    // 現在位置を保存
    lastPointerPosition = currentPosition;
    
    // 描画モードと選択モードで処理を分ける（Fabric.jsが内部で処理するので、ここでは特に何もしない）
    // 将来的にカスタム処理が必要な場合はここに追加
    
    // iOS向けの特別処理
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        e.preventDefault();
    }
}

// ポインターアップイベントハンドラー（新規追加）
function handlePointerUp(e) {
    // イベント情報のデバッグ表示
    if (pointerDebugMode) {
        updateStatus(`PointerUp: type=${e.pointerType}, id=${e.pointerId}`);
    }
    
    // ポインターの状態をリセット
    isPointerDown = false;
    
    // キャプチャの解放
    if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
    }
    
    // iOS向けの特別処理
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        e.preventDefault();
    }
}

// ポインターキャンセルイベントハンドラー（新規追加）
function handlePointerCancel(e) {
    // イベント情報のデバッグ表示
    if (pointerDebugMode) {
        updateStatus(`PointerCancel: type=${e.pointerType}, id=${e.pointerId}`);
    }
    
    // ポインターの状態をリセット
    isPointerDown = false;
    
    // キャプチャの解放
    if (e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
    }
}

// 描画モード切替
function setDrawingMode(enable) {
    isDrawingMode = enable;
    canvas.isDrawingMode = enable;
    
    // モード切替時のポインター状態リセット（新規追加）
    isPointerDown = false;
    
    updateStatus('モード変更: ' + (enable ? '描画' : '選択'));
}

// テキスト追加
function addText(text) {
    const textObj = new fabric.IText(text, {
        left: canvas.width / 2 - 50,
        top: canvas.height / 2 - 15,
        fontFamily: 'sans-serif',
        fill: currentColor,
        fontSize: 30
    });
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    updateStatus('テキスト追加');
}

// スタンプ追加（サンプル円を追加）
function addStamp() {
    const circle = new fabric.Circle({
        radius: 30,
        fill: 'rgba(0,128,255,0.5)',
        left: canvas.width / 2 - 30,
        top: canvas.height / 2 - 30
    });
    canvas.add(circle);
    updateStatus('スタンプ追加（サンプル）');
}

// キャンバスクリア
function clearCanvas() {
    canvas.clear();
    canvas.backgroundColor = '#FFFFFF';
    canvas.renderAll();
    updateStatus('キャンバスクリア');
}

// JSONとして保存
function saveAsJSON() {
    try {
        const json = JSON.stringify(canvas.toJSON());
        const jsonOutput = document.getElementById('json-output');
        if (jsonOutput) {
            jsonOutput.textContent = json;
            jsonOutput.style.display = 'block';
            setTimeout(() => {
                jsonOutput.style.display = 'none';
            }, 3000);
        }
        updateStatus('JSONとして保存');
        return json;
    } catch (error) {
        updateStatus('JSON保存エラー: ' + error.message, true);
        return null;
    }
}

// JSONから読み込み
function loadFromJSON(jsonString) {
    try {
        let json = jsonString;
        if (!json) {
            const jsonOutput = document.getElementById('json-output');
            if (jsonOutput) {
                json = jsonOutput.textContent;
            }
            if (!json) {
                updateStatus('読み込むJSONがありません', true);
                return;
            }
        }
        canvas.loadFromJSON(json, function() {
            canvas.renderAll();
            updateStatus('JSONから読み込み完了');
        });
    } catch (error) {
        updateStatus('JSON読み込みエラー: ' + error.message, true);
    }
}

// 画像として保存
function saveAsImage() {
    try {
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1
        });
        updateStatus('画像保存完了');
        return dataURL;
    } catch (error) {
        updateStatus('画像保存エラー: ' + error.message, true);
        return null;
    }
}

// FileMakerにデータを送信
function sendToFileMaker() {
    try {
        const jsonData = saveAsJSON();
        const imageData = saveAsImage();
        
        // FileMaker関数呼び出し
        if (window.FileMaker) {
            const data = {
                json: jsonData,
                image: imageData
            };
            window.FileMaker.PerformScript(fmCallbackFunction, JSON.stringify(data));
            updateStatus('FileMakerに送信完了');
        } else {
            // テスト用（FileMaker環境でない場合）
            updateStatus('FileMaker環境ではありません');
            console.log('FileMaker送信データ:', { json: jsonData });
        }
    } catch (error) {
        updateStatus('FileMaker送信エラー: ' + error.message, true);
    }
}

// FileMakerからデータを取得
function getFromFileMaker() {
    try {
        // FileMaker関数呼び出し
        if (window.FileMaker) {
            window.FileMaker.PerformScript('ShikaGraphGetData', '');
            updateStatus('FileMakerからデータ取得リクエスト送信');
        } else {
            // テスト用（FileMaker環境でない場合）
            updateStatus('FileMaker環境ではありません（テスト用データをロード）');
            const testJson = '{"version":"6.7.0","objects":[{"type":"circle","version":"6.7.0","originX":"left","originY":"top","left":100,"top":100,"width":60,"height":60,"fill":"rgba(0,128,255,0.5)","stroke":null,"strokeWidth":1,"strokeDashArray":null,"strokeLineCap":"butt","strokeDashOffset":0,"strokeLineJoin":"miter","strokeUniform":false,"strokeMiterLimit":4,"scaleX":1,"scaleY":1,"angle":0,"flipX":false,"flipY":false,"opacity":1,"shadow":null,"visible":true,"backgroundColor":"","fillRule":"nonzero","paintFirst":"fill","globalCompositeOperation":"source-over","skewX":0,"skewY":0,"radius":30,"startAngle":0,"endAngle":6.283185307179586}],"background":"#FFFFFF"}';
            loadFromJSON(testJson);
        }
    } catch (error) {
        updateStatus('FileMakerデータ取得エラー: ' + error.message, true);
    }
}

// FileMakerからの呼び出しを処理
function handleFileMakerCall(action, data) {
    try {
        updateStatus('FileMakerからの呼び出し: ' + action);
        
        switch (action) {
            case 'loadData':
                if (data && data.json) {
                    loadFromJSON(data.json);
                }
                break;
                
            case 'setBackground':
                if (data && data.backgroundUrl) {
                    setBackgroundImage(data.backgroundUrl);
                }
                break;
                
            default:
                updateStatus('不明なFileMakerアクション: ' + action, true);
        }
    } catch (error) {
        updateStatus('FileMaker呼び出し処理エラー: ' + error.message, true);
    }
}

// 背景画像設定
function setBackgroundImage(url) {
    try {
        fabric.Image.fromURL(url, function(img) {
            // 画像のアスペクト比を維持しながらキャンバスに合わせる
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            );
            
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: scale,
                scaleY: scale,
                // 中央に配置
                left: (canvas.width - img.width * scale) / 2,
                top: (canvas.height - img.height * scale) / 2
            });
            updateStatus('背景画像設定完了');
        });
    } catch (error) {
        updateStatus('背景画像設定エラー: ' + error.message, true);
    }
}

// キャンバスリサイズ
function resizeCanvas() {
    try {
        const container = document.getElementById('canvas-container');
        if (!container) {
            throw new Error('キャンバスコンテナが見つかりません');
        }
        
        const containerRect = container.getBoundingClientRect();
        
        canvas.setWidth(containerRect.width);
        canvas.setHeight(containerRect.height);
        canvas.renderAll();
        updateStatus('キャンバスリサイズ完了');
    } catch (error) {
        updateStatus('リサイズエラー: ' + error.message, true);
    }
}

// ステータス更新
function updateStatus(message, isError = false) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = isError ? 'red' : 'black';
    }
    console.log(isError ? 'ERROR: ' : 'INFO: ', message);
}

// ページ読み込み完了時とサイズ変更時に実行
window.addEventListener('load', function() {
    // iOSデバイス特有の問題に対応
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.style.height = window.innerHeight + 'px';
        setTimeout(resizeCanvas, 300); // iOS向け遅延処理
    }
});

// デバッグ情報表示用のUIを追加（新規追加）
function addDebugUI() {
    // 既存のデバッグコンテナがあれば何もしない
    if (document.getElementById('debug-container')) {
        return;
    }
    
    const debugContainer = document.createElement('div');
    debugContainer.id = 'debug-container';
    debugContainer.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; z-index: 9999;';
    
    const debugToggle = document.createElement('button');
    debugToggle.id = 'toggle-debug';
    debugToggle.textContent = 'デバッグ表示切替';
    debugToggle.style.cssText = 'padding: 5px; margin-bottom: 5px; width: 100%;';
    
    debugContainer.appendChild(debugToggle);
    document.body.appendChild(debugContainer);
    
    // デバッグUIが追加されたらイベントリスナーを設定
    debugToggle.addEventListener('click', function() {
        pointerDebugMode = !pointerDebugMode;
        updateStatus('デバッグモード: ' + (pointerDebugMode ? 'オン' : 'オフ'));
    });
    
    updateStatus('デバッグUI追加完了');
}

// デバッグUIを追加（開発時に有効にする）
window.addEventListener('load', addDebugUI);