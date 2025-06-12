/**
 * キャンバス管理クラス
 * Fabric.jsを使用してキャンバスの初期化、イベント処理、描画モードの管理を行う
 */
class CanvasManager {
    constructor() {
        this.canvas = null;
        this.currentMode = null;
        this.modes = {};
        this.history = {
            undoStack: [],
            redoStack: [],
            saved: false
        };
        this.isDrawing = false;
        this.drawingSettings = {
            color: 'black',
            width: 2
        };
        this.textSettings = {
            color: 'black',
            size: 16,
            fontFamily: 'Arial'
        };
    }

    /**
     * キャンバスを初期化
     */
    initCanvas() {
        // Fabric.jsキャンバスを初期化
        this.canvas = new fabric.Canvas('canvas', {
            width: 800,
            height: 600,
            backgroundColor: 'white',
            selection: true, // オブジェクト選択を有効
            preserveObjectStacking: true // オブジェクト重ね順を維持
        });

        // キャンバスのサイズをコンテナに合わせる
        this.resizeCanvas();
        
        // ウィンドウリサイズ時にキャンバスサイズも調整
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // キャンバスの状態変更時のイベントリスナー
        this.canvas.on('object:added', () => this.saveCanvasState());
        this.canvas.on('object:modified', () => this.saveCanvasState());
        this.canvas.on('object:removed', () => this.saveCanvasState());

        // 初期状態を保存
        this.saveCanvasState();
    }

    /**
     * キャンバスのサイズをコンテナに合わせて調整
     */
    resizeCanvas() {
        const container = document.querySelector('.draw-area');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.canvas.setWidth(width);
        this.canvas.setHeight(height);
        this.canvas.calcOffset();
    }

    /**
     * 描画モードを登録
     * @param {string} modeName - モード名
     * @param {Object} modeHandler - モード処理オブジェクト
     */
    registerMode(modeName, modeHandler) {
        this.modes[modeName] = modeHandler;
    }

    /**
     * 描画モードを切り替え
     * @param {string} modeName - 切り替え先のモード名
     */
    setMode(modeName) {
        // 現在のモードがあれば非アクティブにする
        if (this.currentMode && this.modes[this.currentMode]) {
            this.modes[this.currentMode].deactivate();
        }
        
        // 新しいモードをアクティブにする
        if (this.modes[modeName]) {
            this.currentMode = modeName;
            this.modes[modeName].activate();
            
            // UIの状態も更新
            this.updateModeUI(modeName);
        } else {
            console.warn(`モード "${modeName}" は登録されていません`);
        }
    }

    /**
     * UIのモード状態を更新
     * @param {string} modeName - アクティブなモード名
     */
    updateModeUI(modeName) {
        // すべてのツールボタンから選択状態を解除
        document.querySelectorAll('.tool-button').forEach(button => {
            button.classList.remove('active-tool');
        });
        
        // モードに対応するボタンがあれば選択状態にする
        let buttonSelector = '';
        switch (modeName) {
            case 'freedraw':
                buttonSelector = '#freeDrawBtn';
                break;
            case 'eraser':
                buttonSelector = '#eraserBtn';
                break;
            case 'text':
                buttonSelector = '#textBtn';
                break;
            // 他のモードも必要に応じて追加
        }
        
        if (buttonSelector) {
            const button = document.querySelector(buttonSelector);
            if (button) {
                button.classList.add('active-tool');
            }
        }
    }

    /**
     * 描画色を設定
     * @param {string} color - 色コード
     */
    setDrawingColor(color) {
        this.drawingSettings.color = color;
        
        // 色ボタンのUI更新
        document.querySelectorAll('.color-button').forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-color') === color) {
                button.classList.add('active');
            }
        });
    }

    /**
     * 線の太さを設定
     * @param {number} width - 線の太さ
     */
    setLineWidth(width) {
        this.drawingSettings.width = width;
        
        // 線幅ボタンのUI更新
        document.querySelectorAll('.line-width-button').forEach(button => {
            button.classList.remove('active');
            if (parseInt(button.getAttribute('data-width')) === width) {
                button.classList.add('active');
            }
        });
    }

    /**
     * テキスト設定を更新
     * @param {Object} settings - テキスト設定オブジェクト
     */
    setTextSettings(settings) {
        this.textSettings = { ...this.textSettings, ...settings };
        
        // テキスト色ボタンのUI更新
        if (settings.color) {
            document.querySelectorAll('.text-color-btn').forEach(button => {
                button.classList.remove('active');
                if (button.getAttribute('data-color') === settings.color) {
                    button.classList.add('active');
                }
            });
        }
        
        // テキストサイズボタンのUI更新
        if (settings.size) {
            document.querySelectorAll('.text-size-btn').forEach(button => {
                button.classList.remove('active');
                if (parseInt(button.getAttribute('data-size')) === settings.size) {
                    button.classList.add('active');
                }
            });
        }
    }

    /**
     * キャンバスの状態を保存（Undo/Redo用）
     */
    saveCanvasState() {
        // 現在の操作中は状態を保存しない
        if (this.isDrawing) return;
        
        // キャンバスの現在の状態をJSONとして取得
        const canvasJSON = JSON.stringify(this.canvas.toJSON(['id', 'selectable']));
        
        // 直前の状態と同じ場合は保存しない
        const lastState = this.history.undoStack[this.history.undoStack.length - 1];
        if (lastState === canvasJSON) return;
        
        // 新しい操作をした場合はRedoスタックをクリア
        if (this.history.redoStack.length > 0) {
            this.history.redoStack = [];
        }
        
        // 状態をUndoスタックに追加
        this.history.undoStack.push(canvasJSON);
        
        // スタックが大きくなりすぎないように制限
        if (this.history.undoStack.length > 30) {
            this.history.undoStack.shift();
        }
        
        // 保存状態フラグを更新
        this.history.saved = false;
        
        // Undo/Redoボタンの状態を更新
        this.updateUndoRedoButtons();
    }

    /**
     * 操作を元に戻す（Undo）
     */
    undo() {
        if (this.history.undoStack.length <= 1) return; // 初期状態は残す
        
        // 現在の状態をRedoスタックに保存
        const currentState = this.history.undoStack.pop();
        this.history.redoStack.push(currentState);
        
        // 一つ前の状態を復元
        const previousState = this.history.undoStack[this.history.undoStack.length - 1];
        this.loadCanvasState(previousState);
        
        // ボタン状態を更新
        this.updateUndoRedoButtons();
    }

    /**
     * 操作をやり直す（Redo）
     */
    redo() {
        if (this.history.redoStack.length === 0) return;
        
        // Redoスタックから状態を取得
        const nextState = this.history.redoStack.pop();
        
        // 状態を復元
        this.loadCanvasState(nextState);
        
        // 復元した状態をUndoスタックに追加
        this.history.undoStack.push(nextState);
        
        // ボタン状態を更新
        this.updateUndoRedoButtons();
    }

    /**
     * 指定された状態をキャンバスに読み込む
     * @param {string} state - キャンバス状態のJSON文字列
     */
    loadCanvasState(state) {
        // キャンバスをクリア
        this.canvas.clear();
        
        // 状態を復元
        this.canvas.loadFromJSON(state, () => {
            this.canvas.renderAll();
        });
    }

    /**
     * Undo/Redoボタンの状態を更新
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = this.history.undoStack.length <= 1;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.history.redoStack.length === 0;
        }
    }

    /**
     * キャンバスの内容を画像として取得
     * @param {string} format - 画像フォーマット（'png', 'jpeg'など）
     * @param {number} quality - 画質（0.0〜1.0）
     * @returns {string} Base64エンコードされた画像データ
     */
    getCanvasImage(format = 'png', quality = 1.0) {
        // 透明度を保持する場合はPNG、そうでなければJPEG
        const dataURL = this.canvas.toDataURL({
            format: format,
            quality: quality,
            multiplier: 1
        });
        
        return dataURL;
    }

    /**
     * キャンバスの状態をJSON形式で取得
     * @returns {Object} キャンバス状態のJSONオブジェクト
     */
    getCanvasJSON() {
        return this.canvas.toJSON(['id', 'selectable']);
    }

    /**
     * JSON形式の状態からキャンバスを復元
     * @param {Object|string} json - キャンバス状態のJSONオブジェクトまたは文字列
     */
    loadFromJSON(json) {
        // 文字列の場合はパース
        const jsonData = typeof json === 'string' ? JSON.parse(json) : json;
        
        // キャンバスをクリア
        this.canvas.clear();
        
        // 状態を読み込み
        this.canvas.loadFromJSON(jsonData, () => {
            this.canvas.renderAll();
            
            // 履歴スタックをリセット
            this.history.undoStack = [JSON.stringify(jsonData)];
            this.history.redoStack = [];
            
            // ボタン状態を更新
            this.updateUndoRedoButtons();
        });
    }

    /**
     * キャンバスをクリア
     */
    clearCanvas() {
        // 確認ダイアログ（FileMaker連携時に必要に応じて変更）
        if (confirm('キャンバスをクリアしますか？')) {
            this.canvas.clear();
            this.canvas.backgroundColor = 'white';
            this.canvas.renderAll();
            
            // 履歴に保存
            this.saveCanvasState();
        }
    }

    /**
     * スタンプを追加
     * @param {Object} icon - アイコン情報
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    addStamp(icon, x, y) {
        // アイコンの画像パスを取得
        const imgPath = `assets/${icon.file}`;
        
        // Fabric.jsのImageオブジェクトとして読み込み
        fabric.Image.fromURL(imgPath, (img) => {
            // サイズを調整
            const scale = 0.5; // サイズ調整（必要に応じて変更）
            img.scale(scale);
            
            // 位置を設定
            img.set({
                left: x,
                top: y,
                originX: 'center',
                originY: 'center',
                id: icon.id,
                selectable: true,
                hasControls: true,
                hasBorders: true
            });
            
            // キャンバスに追加
            this.canvas.add(img);
            this.canvas.setActiveObject(img);
            this.canvas.renderAll();
            
            // 履歴に保存
            this.saveCanvasState();
        });
    }

    /**
     * テキストを追加
     * @param {string} text - テキスト内容
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    addText(text, x, y) {
        // テキストオブジェクトを作成
        const textObj = new fabric.IText(text, {
            left: x,
            top: y,
            fontFamily: this.textSettings.fontFamily,
            fontSize: this.textSettings.size,
            fill: this.textSettings.color,
            selectable: true,
            editable: true
        });
        
        // キャンバスに追加
        this.canvas.add(textObj);
        this.canvas.setActiveObject(textObj);
        this.canvas.renderAll();
        
        // 履歴に保存
        this.saveCanvasState();
    }

    /**
     * 選択オブジェクトを削除
     */
    deleteSelected() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            this.canvas.remove(activeObject);
            this.canvas.renderAll();
            
            // 履歴に保存
            this.saveCanvasState();
        }
    }
}

// グローバルにクラスを公開
window.CanvasManager = CanvasManager;

// シングルトンインスタンスをエクスポート
window.canvasManager = new CanvasManager();