/**
 * ShikaGraph メインアプリケーション
 * 各モジュールの初期化と連携を行う
 */
document.addEventListener('DOMContentLoaded', () => {
    // デバッグモード
    const DEBUG = true;
    
    // グローバル変数の存在確認
    if (typeof CanvasManager === 'undefined') {
        console.error('CanvasManager クラスが読み込まれていません');
        showErrorOverlay('CanvasManager クラスが読み込まれていません。JavaScriptファイルが正しく読み込まれているか確認してください。');
        return;
    }
    
    if (typeof canvasManager === 'undefined') {
        console.log('canvasManager インスタンスを作成します');
        window.canvasManager = new CanvasManager();
    }
    
    // アプリケーション初期化
    initApp();
    
    /**
     * アプリケーションの初期化
     */
    async function initApp() {
        try {
            // 画像読み込みエラーの処理を設定
            setupImageErrorHandling();
            
            // Fabric.jsキャンバスの初期化
            canvasManager.initCanvas();
            
            // アイコンデータの読み込み
            if (typeof iconManager === 'undefined') {
                console.log('iconManager インスタンスを作成します');
                window.iconManager = new IconManager();
            }
            
            await iconManager.loadIcons();
            iconManager.renderIcons();
            
            // 描画モードの登録
            registerDrawingModes();
            
            // UIイベントの初期化
            initUIEvents();
            
            // デフォルトモードを設定（フリーハンド描画）
            canvasManager.setMode('freedraw');
            
            if (DEBUG) console.log('ShikaGraph initialized successfully!');
        } catch (error) {
            console.error('ShikaGraph initialization failed:', error);
            showError('初期化に失敗しました: ' + error.message);
        }
    }
    
    /**
     * 描画モードの登録
     */
    function registerDrawingModes() {
        // フリーハンド描画モード
        const drawMode = new DrawMode(canvasManager);
        canvasManager.registerMode('freedraw', drawMode);
        
        // スタンプモード
        const stampMode = new StampMode(canvasManager, iconManager);
        canvasManager.registerMode('stamp', stampMode);
        
        // テキストモード
        const textMode = new TextMode(canvasManager);
        canvasManager.registerMode('text', textMode);
        
        // 選択モード（Fabric.jsのデフォルト機能を利用）
        canvasManager.registerMode('select', {
            activate: function() {
                canvasManager.canvas.selection = true;
                canvasManager.canvas.forEachObject(obj => {
                    obj.selectable = true;
                    obj.evented = true;
                });
                canvasManager.canvas.defaultCursor = 'default';
                canvasManager.canvas.hoverCursor = 'move';
            },
            deactivate: function() {
                // 何もしない（他のモードで上書きされる）
            }
        });
        
        // アイコン選択時のコールバックを設定
        iconManager.setIconSelectedCallback((icon) => {
            stampMode.selectIcon(icon);
            canvasManager.setMode('stamp');
        });
    }
    
    /**
     * UIイベントの初期化
     */
    function initUIEvents() {
        // タブ切り替えイベント
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                
                // タブ切り替え処理
                setActiveTab(tabName);
                
                // タブごとの適切なモードを設定
                if (tabName === 'DLW') {
                    // 描画タブではデフォルトでフリーハンド描画モード
                    canvasManager.setMode('freedraw');
                } else {
                    // 他のタブではスタンプモード
                    canvasManager.setMode('stamp');
                }
            });
        });
        
        // 描画ツールのイベント
        const freeDrawBtn = document.getElementById('freeDrawBtn');
        if (freeDrawBtn) {
            freeDrawBtn.addEventListener('click', () => {
                canvasManager.setMode('freedraw');
            });
        }
        
        // 消しゴム（選択モード）のイベント
        const eraserBtn = document.getElementById('eraserBtn');
        if (eraserBtn) {
            eraserBtn.addEventListener('click', () => {
                canvasManager.setMode('select');
            });
        }
        
        // カラーボタンのイベント
        const colorButtons = document.querySelectorAll('.color-button');
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const color = button.getAttribute('data-color');
                canvasManager.setDrawingColor(color);
            });
        });
        
        // 線幅ボタンのイベント
        const lineWidthButtons = document.querySelectorAll('.line-width-button');
        lineWidthButtons.forEach(button => {
            button.addEventListener('click', () => {
                const width = parseInt(button.getAttribute('data-width'));
                canvasManager.setLineWidth(width);
            });
        });
        
        // キャンバスリセットボタン
        const resetCanvasBtn = document.getElementById('resetCanvasBtn');
        if (resetCanvasBtn) {
            resetCanvasBtn.addEventListener('click', () => {
                canvasManager.clearCanvas();
            });
        }
        
        // Undo/Redoボタン
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                canvasManager.undo();
            });
        }
        
        const redoBtn = document.getElementById('redoBtn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                canvasManager.redo();
            });
        }
        
        // 保存ボタン
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveCanvas();
            });
        }
        
        // 読込ボタン
        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                loadCanvas();
            });
        }
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Z (Undo)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                canvasManager.undo();
            }
            
            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (Redo)
            if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
                ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
                e.preventDefault();
                canvasManager.redo();
            }
            
            // Delete or Backspace (選択オブジェクト削除)
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObject = canvasManager.canvas.getActiveObject();
                if (activeObject) {
                    canvasManager.canvas.remove(activeObject);
                    canvasManager.saveCanvasState();
                }
            }
        });
    }
    
    /**
     * タブを切り替える
     * @param {string} tabName - アクティブにするタブ名
     */
    function setActiveTab(tabName) {
        // すべてのタブを非アクティブにする
        document.querySelectorAll('.tab-pane').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // すべてのタブボタンを非アクティブにする
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // 指定されたタブをアクティブにする
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // 対応するタブボタンをアクティブにする
        const targetButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }
    
    /**
     * キャンバスを保存する
     * FileMaker連携時はここを修正
     */
    function saveCanvas() {
        try {
            // キャンバスの状態をJSON形式で取得
            const canvasData = JSON.stringify(canvasManager.getCanvasJSON());
            
            // Canvas画像をBase64形式で取得
            const imageData = canvasManager.getCanvasImage();
            
            if (DEBUG) {
                console.log('Canvas JSON Data:', canvasData.substring(0, 100) + '...');
                console.log('Canvas Image Data:', imageData.substring(0, 100) + '...');
            }
            
            // FileMaker連携時はここでFileMakerにデータを送信
            // 例: window.FileMaker.PerformScript('SaveCanvas', JSON.stringify({canvasData, imageData}));
            
            // 仮のローカル保存機能（デモ用）
            localStorage.setItem('shikagraph_canvas', canvasData);
            alert('キャンバスが保存されました');
        } catch (error) {
            console.error('キャンバスの保存に失敗しました:', error);
            alert('保存に失敗しました: ' + error.message);
        }
    }
    
    /**
     * キャンバスを読み込む
     * FileMaker連携時はここを修正
     */
    function loadCanvas() {
        try {
            // ローカルストレージからデータを取得（デモ用）
            const canvasData = localStorage.getItem('shikagraph_canvas');
            
            if (!canvasData) {
                alert('保存されたデータがありません');
                return;
            }
            
            // キャンバスに読み込み
            canvasManager.loadFromJSON(canvasData);
            alert('キャンバスを読み込みました');
        } catch (error) {
            console.error('キャンバスの読み込みに失敗しました:', error);
            alert('読み込みに失敗しました: ' + error.message);
        }
    }
    
    /**
     * 画像読み込みエラーのハンドリングを設定
     */
    function setupImageErrorHandling() {
        // すべての画像要素のエラーイベントを監視
        document.addEventListener('error', function(e) {
            const element = e.target;
            
            // 画像要素のエラーのみ処理
            if (element.tagName === 'IMG') {
                // エラーが発生した画像にクラスを追加
                element.classList.add('error');
                
                if (DEBUG) {
                    console.warn(`画像の読み込みに失敗: ${element.src}`);
                    
                    // ボタン内の画像なら親ボタンのテキストを表示
                    const parentButton = element.closest('.tool-button');
                    if (parentButton) {
                        const buttonText = parentButton.querySelector('.button-text');
                        if (buttonText) {
                            buttonText.style.display = 'block';
                        }
                    }
                }
            }
        }, true); // キャプチャリングフェーズで実行
    }
    
    /**
     * エラーメッセージを表示
     * @param {string} message - 表示するエラーメッセージ
     */
    function showError(message) {
        // すでにエラーコンテナがあれば再利用、なければ作成
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            errorContainer.className = 'error-message';
            document.body.appendChild(errorContainer);
        }
        
        // メッセージを設定して表示
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // 5秒後に自動的に消える
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
    
    /**
     * エラーオーバーレイを表示（致命的なエラー用）
     * @param {string} message - 表示するエラーメッセージ
     */
    function showErrorOverlay(message) {
        // エラーオーバーレイを作成
        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.innerHTML = `
            <div class="error-overlay-content">
                <h3>初期化エラー</h3>
                <p>${message}</p>
                <div class="debug-info">
                    <h4>デバッグ情報:</h4>
                    <ul>
                        <li>ブラウザ: ${navigator.userAgent}</li>
                        <li>URL: ${window.location.href}</li>
                        <li>時刻: ${new Date().toLocaleString()}</li>
                    </ul>
                </div>
                <button class="error-close-btn">閉じる</button>
            </div>
        `;
        
        // ボディに追加
        document.body.appendChild(overlay);
        
        // 閉じるボタンのイベント
        const closeBtn = overlay.querySelector('.error-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.remove();
            });
        }
    }
});