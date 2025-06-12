/**
 * テキストモードクラス
 * Fabric.jsを使用したテキスト入力機能を管理
 */
class TextMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;
        this.isActive = false;
        this.textOptions = {
            color: 'black',
            size: 24,
            fontFamily: 'Arial'
        };
        
        // イベントハンドラをバインド
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundTouchStartHandler = this.handleTouchStart.bind(this);
        
        // テキストオプションUI要素
        this.textOptionsContainer = document.querySelector('.text-options-container');
        this.colorButtons = document.querySelectorAll('.text-color-btn');
        this.sizeButtons = document.querySelectorAll('.text-size-btn');
        
        // UIイベントを初期化
        this.initUI();
    }

    /**
     * UI要素の初期化
     */
    initUI() {
        // テキストボタンのクリックイベント
        const textBtn = document.getElementById('textBtn');
        if (textBtn) {
            textBtn.addEventListener('click', () => {
                // テキストモードをアクティブにする
                this.canvasManager.setMode('text');
                
                // テキストオプションを表示
                if (this.textOptionsContainer) {
                    this.textOptionsContainer.style.display = 'block';
                }
            });
        }
        
        // テキスト色ボタンのイベント
        this.colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const color = button.getAttribute('data-color');
                this.setTextColor(color);
            });
        });
        
        // テキストサイズボタンのイベント
        this.sizeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const size = parseInt(button.getAttribute('data-size'));
                this.setTextSize(size);
            });
        });
        
        // 初期選択状態を設定
        this.updateUI();
    }

    /**
     * テキストモードをアクティブにする
     */
    activate() {
        this.isActive = true;
        
        // カーソルを変更
        this.canvas.defaultCursor = 'text';
        
        // オブジェクト選択を無効化（新規テキスト作成用）
        this.canvas.selection = false;
        this.canvas.forEachObject(obj => {
            // テキストオブジェクトは選択可能にする
            if (obj instanceof fabric.IText) {
                obj.selectable = true;
                obj.editable = true;
                obj.evented = true;
            } else {
                obj.selectable = false;
                obj.evented = false;
            }
        });
        
        // イベントリスナーを追加
        this.canvas.on('mouse:down', this.boundClickHandler);
        this.canvas.on('touch:start', this.boundTouchStartHandler);
        
        // テキストオプションを表示
        if (this.textOptionsContainer) {
            this.textOptionsContainer.style.display = 'block';
        }
    }

    /**
     * テキストモードを非アクティブにする
     */
    deactivate() {
        this.isActive = false;
        
        // カーソルを元に戻す
        this.canvas.defaultCursor = 'default';
        
        // オブジェクト選択を有効化
        this.canvas.selection = true;
        this.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = true;
            
            // テキストオブジェクトの編集モードを無効化
            if (obj instanceof fabric.IText) {
                obj.exitEditing();
            }
        });
        
        // イベントリスナーを削除
        this.canvas.off('mouse:down', this.boundClickHandler);
        this.canvas.off('touch:start', this.boundTouchStartHandler);
        
        // テキストオプションを非表示
        if (this.textOptionsContainer) {
            this.textOptionsContainer.style.display = 'none';
        }
    }

    /**
     * クリックイベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleClick(e) {
        // クリックしたオブジェクトがテキストならそれを編集
        if (e.target && e.target instanceof fabric.IText) {
            this.canvas.setActiveObject(e.target);
            e.target.enterEditing();
            return;
        }
        
        // クリック位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // 新しいテキストを追加
        this.addNewText(pointer.x, pointer.y);
    }

    /**
     * タッチ開始イベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleTouchStart(e) {
        // タッチしたオブジェクトがテキストならそれを編集
        if (e.target && e.target instanceof fabric.IText) {
            this.canvas.setActiveObject(e.target);
            e.target.enterEditing();
            return;
        }
        
        // タッチ位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // 新しいテキストを追加
        this.addNewText(pointer.x, pointer.y);
    }

    /**
     * 新しいテキストを追加
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    addNewText(x, y) {
        // テキスト入力用のプロンプト
        const text = prompt('テキストを入力してください:', '');
        
        // キャンセルまたは空文字の場合は何もしない
        if (text === null || text.trim() === '') return;
        
        // テキストオブジェクトを作成
        const textObj = new fabric.IText(text, {
            left: x,
            top: y,
            fontFamily: this.textOptions.fontFamily,
            fontSize: this.textOptions.size,
            fill: this.textOptions.color,
            selectable: true,
            editable: true,
            originX: 'center',
            originY: 'center'
        });
        
        // キャンバスに追加
        this.canvas.add(textObj);
        this.canvas.setActiveObject(textObj);
        
        // キャンバスの状態を保存
        this.canvasManager.saveCanvasState();
    }

    /**
     * テキスト色を設定
     * @param {string} color - 色コード
     */
    setTextColor(color) {
        this.textOptions.color = color;
        
        // 選択中のテキストオブジェクトがあればその色も変更
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject instanceof fabric.IText) {
            activeObject.set('fill', color);
            this.canvas.renderAll();
            
            // キャンバスの状態を保存
            this.canvasManager.saveCanvasState();
        }
        
        // UI更新
        this.updateUI();
    }

    /**
     * テキストサイズを設定
     * @param {number} size - フォントサイズ
     */
    setTextSize(size) {
        this.textOptions.size = size;
        
        // 選択中のテキストオブジェクトがあればそのサイズも変更
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject instanceof fabric.IText) {
            activeObject.set('fontSize', size);
            this.canvas.renderAll();
            
            // キャンバスの状態を保存
            this.canvasManager.saveCanvasState();
        }
        
        // UI更新
        this.updateUI();
    }

    /**
     * UI状態を更新
     */
    updateUI() {
        // 色ボタンの選択状態を更新
        this.colorButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-color') === this.textOptions.color) {
                button.classList.add('active');
            }
        });
        
        // サイズボタンの選択状態を更新
        this.sizeButtons.forEach(button => {
            button.classList.remove('active');
            if (parseInt(button.getAttribute('data-size')) === this.textOptions.size) {
                button.classList.add('active');
            }
        });
    }
}

// グローバルにクラスを公開
window.TextMode = TextMode;