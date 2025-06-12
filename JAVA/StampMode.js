/**
 * スタンプモードクラス
 * アイコンをキャンバスに配置する機能を管理
 */
class StampMode {
    constructor(canvasManager, iconManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;
        this.iconManager = iconManager;
        this.selectedIcon = null;
        this.isActive = false;
        this.previewImage = null;
        
        // イベントハンドラをバインド
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundMoveHandler = this.handleMove.bind(this);
        this.boundTouchStartHandler = this.handleTouchStart.bind(this);
    }

    /**
     * スタンプモードをアクティブにする
     */
    activate() {
        this.isActive = true;
        
        // カーソルを変更
        this.canvas.defaultCursor = 'crosshair';
        
        // オブジェクト選択を無効化
        this.canvas.selection = false;
        this.canvas.forEachObject(obj => {
            obj.selectable = false;
            obj.evented = false;
        });
        
        // イベントリスナーを追加
        this.canvas.on('mouse:down', this.boundClickHandler);
        this.canvas.on('mouse:move', this.boundMoveHandler);
        this.canvas.on('touch:start', this.boundTouchStartHandler);
        
        // 選択されているアイコンがあればプレビューを表示
        if (this.selectedIcon) {
            this.showPreview();
        }
    }

    /**
     * スタンプモードを非アクティブにする
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
        });
        
        // イベントリスナーを削除
        this.canvas.off('mouse:down', this.boundClickHandler);
        this.canvas.off('mouse:move', this.boundMoveHandler);
        this.canvas.off('touch:start', this.boundTouchStartHandler);
        
        // プレビューを非表示
        this.hidePreview();
    }

    /**
     * アイコンを選択
     * @param {Object} icon - 選択するアイコン情報
     */
    selectIcon(icon) {
        this.selectedIcon = icon;
        
        // アクティブ状態ならプレビューを表示
        if (this.isActive) {
            this.showPreview();
        }
    }

    /**
     * クリックイベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleClick(e) {
        // 選択されたアイコンがなければ何もしない
        if (!this.selectedIcon) return;
        
        // クリック位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // スタンプを追加
        this.addStamp(pointer.x, pointer.y);
    }

    /**
     * マウス移動イベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleMove(e) {
        // 選択されたアイコンがなければ何もしない
        if (!this.selectedIcon || !this.previewImage) return;
        
        // マウス位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // プレビュー位置を更新
        this.updatePreviewPosition(pointer.x, pointer.y);
    }

    /**
     * タッチ開始イベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleTouchStart(e) {
        // 選択されたアイコンがなければ何もしない
        if (!this.selectedIcon) return;
        
        // タッチ位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // スタンプを追加
        this.addStamp(pointer.x, pointer.y);
    }

    /**
     * スタンプをキャンバスに追加
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    addStamp(x, y) {
        // アイコンの画像パスを取得（.svgを.pngに変更）
        const imgPath = `assets/${this.selectedIcon.file.replace('.svg', '.png')}`;
        
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
                id: this.selectedIcon.id,
                category: this.selectedIcon.category,
                selectable: false, // スタンプモード中は選択不可
                evented: false,    // スタンプモード中はイベント無効
                hasControls: true, // 選択モードで操作可能にする
                hasBorders: true,
                data: {
                    iconId: this.selectedIcon.id,
                    category: this.selectedIcon.category,
                    name_ja: this.selectedIcon.name_ja,
                    name_en: this.selectedIcon.name_en
                }
            });
            
            // キャンバスに追加
            this.canvas.add(img);
            this.canvas.renderAll();
            
            // キャンバスの状態を保存
            this.canvasManager.saveCanvasState();
        });
    }

    /**
     * プレビューを表示
     */
    showPreview() {
        // 既存のプレビューを削除
        this.hidePreview();
        
        // 選択されたアイコンがなければ何もしない
        if (!this.selectedIcon) return;
        
        // アイコンの画像パスを取得（.svgを.pngに変更）
        const imgPath = `assets/${this.selectedIcon.file.replace('.svg', '.png')}`;
        
        // Fabric.jsのImageオブジェクトとして読み込み
        fabric.Image.fromURL(imgPath, (img) => {
            // サイズを調整
            const scale = 0.5; // サイズ調整（必要に応じて変更）
            img.scale(scale);
            
            // プレビュー用の設定
            img.set({
                left: 0,
                top: 0,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                opacity: 0.6, // 半透明
                hasControls: false,
                hasBorders: false
            });
            
            // プレビューとして保持
            this.previewImage = img;
            
            // キャンバスに追加
            this.canvas.add(this.previewImage);
            this.canvas.renderAll();
        });
    }

    /**
     * プレビューを非表示
     */
    hidePreview() {
        if (this.previewImage) {
            this.canvas.remove(this.previewImage);
            this.previewImage = null;
            this.canvas.renderAll();
        }
    }

    /**
     * プレビュー位置を更新
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    updatePreviewPosition(x, y) {
        if (this.previewImage) {
            this.previewImage.set({
                left: x,
                top: y
            });
            this.canvas.renderAll();
        }
    }
}

// グローバルにクラスを公開
window.StampMode = StampMode;
window.IconCategoryManager = IconCategoryManager;

// アイコンカテゴリ管理クラス
class IconCategoryManager {
    constructor(stampMode) {
        this.stampMode = stampMode;
        this.categories = {
            diagnosis: document.getElementById('DIAG'),
            treatment_plan: document.getElementById('PLN'),
            restoration: document.getElementById('REST')
        };
        
        // タブボタンの初期化
        this.initTabButtons();
    }

    /**
     * タブボタンの初期化
     */
    initTabButtons() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.activateTab(tabName);
            });
        });
    }

    /**
     * タブをアクティブにする
     * @param {string} tabName - タブ名
     */
    activateTab(tabName) {
        // すべてのタブとボタンを非アクティブにする
        document.querySelectorAll('.tab-pane').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // 指定されたタブとボタンをアクティブにする
        const activeTab = document.getElementById(tabName);
        const activeButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // タブに応じてモードを切り替え
        switch (tabName) {
            case 'DIAG':
            case 'PLN':
            case 'REST':
                // スタンプモードをアクティブにする
                this.stampMode.canvasManager.setMode('stamp');
                break;
            case 'DLW':
                // デフォルトは描画モード
                this.stampMode.canvasManager.setMode('freedraw');
                break;
        }
    }
}