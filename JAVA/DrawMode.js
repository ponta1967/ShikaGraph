/**
 * フリーハンド描画モードクラス
 * Fabric.jsを使用したフリーハンド描画機能を管理
 */
class DrawMode {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.canvas = canvasManager.canvas;
        this.isDrawing = false;
        this.path = null;
        this.points = [];
        this.boundMouseDownHandler = this.handleMouseDown.bind(this);
        this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
        this.boundMouseUpHandler = this.handleMouseUp.bind(this);
        this.boundTouchStartHandler = this.handleTouchStart.bind(this);
        this.boundTouchMoveHandler = this.handleTouchMove.bind(this);
        this.boundTouchEndHandler = this.handleTouchEnd.bind(this);
    }

    /**
     * フリーハンド描画モードをアクティブにする
     */
    activate() {
        // カーソルを変更
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';
        this.canvas.freeDrawingCursor = 'crosshair';
        
        // オブジェクト選択を無効化
        this.canvas.selection = false;
        this.canvas.forEachObject(obj => {
            obj.selectable = false;
            obj.evented = false;
        });
        
        // イベントリスナーを追加
        this.canvas.on('mouse:down', this.boundMouseDownHandler);
        this.canvas.on('mouse:move', this.boundMouseMoveHandler);
        this.canvas.on('mouse:up', this.boundMouseUpHandler);
        
        // タッチイベントの追加
        this.canvas.on('touch:start', this.boundTouchStartHandler);
        this.canvas.on('touch:move', this.boundTouchMoveHandler);
        this.canvas.on('touch:end', this.boundTouchEndHandler);
        
        // カーソルイメージを表示（オプション）
        this.showCursorImage();
    }

    /**
     * フリーハンド描画モードを非アクティブにする
     */
    deactivate() {
        // カーソルを元に戻す
        this.canvas.defaultCursor = 'default';
        this.canvas.hoverCursor = 'move';
        this.canvas.freeDrawingCursor = 'crosshair';
        
        // オブジェクト選択を有効化
        this.canvas.selection = true;
        this.canvas.forEachObject(obj => {
            obj.selectable = true;
            obj.evented = true;
        });
        
        // イベントリスナーを削除
        this.canvas.off('mouse:down', this.boundMouseDownHandler);
        this.canvas.off('mouse:move', this.boundMouseMoveHandler);
        this.canvas.off('mouse:up', this.boundMouseUpHandler);
        
        // タッチイベントの削除
        this.canvas.off('touch:start', this.boundTouchStartHandler);
        this.canvas.off('touch:move', this.boundTouchMoveHandler);
        this.canvas.off('touch:end', this.boundTouchEndHandler);
        
        // カーソルイメージを非表示
        this.hideCursorImage();
    }

    /**
     * マウスダウンイベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleMouseDown(e) {
        // 右クリックの場合は無視
        if (e.e.button === 2) return;
        
        // 描画開始
        this.isDrawing = true;
        this.canvasManager.isDrawing = true;
        
        // マウス位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // パスを初期化
        this.points = [pointer.x, pointer.y, pointer.x, pointer.y];
        
        // パスオブジェクトを作成
        this.path = new fabric.Path(`M ${pointer.x} ${pointer.y} L ${pointer.x} ${pointer.y}`, {
            stroke: this.canvasManager.drawingSettings.color,
            strokeWidth: this.canvasManager.drawingSettings.width,
            fill: null,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            selectable: false,
            evented: false
        });
        
        // キャンバスに追加
        this.canvas.add(this.path);
    }

    /**
     * マウス移動イベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        // マウス位置を取得
        const pointer = this.canvas.getPointer(e.e);
        
        // ポイントを追加
        this.points.push(pointer.x, pointer.y);
        
        // パスを更新
        this.updatePath();
        
        // カーソルイメージを更新（オプション）
        this.updateCursorImage(pointer.x, pointer.y);
    }

    /**
     * マウスアップイベントハンドラー
     */
    handleMouseUp() {
        if (!this.isDrawing) return;
        
        // 描画終了
        this.isDrawing = false;
        this.canvasManager.isDrawing = false;
        
        // パスを確定
        this.finalizePath();
        
        // キャンバスの状態を保存
        this.canvasManager.saveCanvasState();
    }

    /**
     * タッチ開始イベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleTouchStart(e) {
        // 複数タッチの場合は無視
        if (e.e.touches && e.e.touches.length > 1) return;
        
        // タッチイベントをマウスイベントと同様に処理
        this.handleMouseDown(e);
    }

    /**
     * タッチ移動イベントハンドラー
     * @param {Object} e - Fabric.jsイベントオブジェクト
     */
    handleTouchMove(e) {
        // 複数タッチの場合は無視
        if (e.e.touches && e.e.touches.length > 1) return;
        
        // スクロールを防止
        e.e.preventDefault();
        
        // タッチイベントをマウスイベントと同様に処理
        this.handleMouseMove(e);
    }

    /**
     * タッチ終了イベントハンドラー
     */
    handleTouchEnd() {
        // タッチ終了をマウスアップと同様に処理
        this.handleMouseUp();
    }

    /**
     * パスを更新
     */
    updatePath() {
        // ポイント配列からSVGパス文字列を生成
        const svgPath = this.createSVGPath(this.points);
        
        // パスオブジェクトのパスデータを更新
        this.path.set({ path: svgPath });
        
        // キャンバスを再描画
        this.canvas.renderAll();
    }

    /**
     * パスを確定
     */
    finalizePath() {
        // 短すぎるパスは無視
        if (this.points.length < 6) {
            this.canvas.remove(this.path);
            return;
        }
        
        // パスを確定
        this.path.setCoords();
        this.canvas.renderAll();
        
        // 参照をクリア
        this.path = null;
        this.points = [];
    }

    /**
     * SVGパス文字列を生成
     * @param {Array} points - ポイント配列 [x1, y1, x2, y2, ...]
     * @returns {string} SVGパス文字列
     */
    createSVGPath(points) {
        // 最低2ポイント必要
        if (points.length < 4) return '';
        
        // 開始点
        let path = `M ${points[0]} ${points[1]} `;
        
        // 各ポイントを線分として追加
        for (let i = 2; i < points.length; i += 2) {
            path += `L ${points[i]} ${points[i + 1]} `;
        }
        
        return path;
    }

    /**
     * カーソルイメージを表示
     */
    showCursorImage() {
        const cursorContainer = document.getElementById('cursorContainer');
        if (!cursorContainer) return;
        
        // すでに存在する場合は削除
        this.hideCursorImage();
        
        // カーソルイメージを作成
        const cursorImage = document.createElement('div');
        cursorImage.id = 'drawCursor';
        cursorImage.style.position = 'absolute';
        cursorImage.style.width = `${this.canvasManager.drawingSettings.width}px`;
        cursorImage.style.height = `${this.canvasManager.drawingSettings.width}px`;
        cursorImage.style.backgroundColor = this.canvasManager.drawingSettings.color;
        cursorImage.style.borderRadius = '50%';
        cursorImage.style.transform = 'translate(-50%, -50%)';
        cursorImage.style.pointerEvents = 'none';
        cursorImage.style.zIndex = '1000';
        
        // コンテナに追加
        cursorContainer.appendChild(cursorImage);
        
        // カーソル位置の初期化
        document.addEventListener('mousemove', this.updateCursorPosition);
    }

    /**
     * カーソルイメージを非表示
     */
    hideCursorImage() {
        const cursor = document.getElementById('drawCursor');
        if (cursor) {
            cursor.remove();
        }
        
        // イベントリスナーを削除
        document.removeEventListener('mousemove', this.updateCursorPosition);
    }

    /**
     * カーソルイメージの位置を更新
     * @param {Event} e - マウスイベント
     */
    updateCursorPosition(e) {
        const cursor = document.getElementById('drawCursor');
        if (!cursor) return;
        
        // カーソル位置を取得
        const canvasElement = document.getElementById('canvas');
        const rect = canvasElement.getBoundingClientRect();
        
        // キャンバス領域内かチェック
        if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        ) {
            // カーソル位置を設定
            cursor.style.left = `${e.clientX - rect.left}px`;
            cursor.style.top = `${e.clientY - rect.top}px`;
            cursor.style.display = 'block';
        } else {
            // キャンバス外では非表示
            cursor.style.display = 'none';
        }
    }

    /**
     * カーソルイメージを更新
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    updateCursorImage(x, y) {
        const cursor = document.getElementById('drawCursor');
        if (!cursor) return;
        
        // カーソル位置を更新
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        
        // カーソルサイズと色を更新
        cursor.style.width = `${this.canvasManager.drawingSettings.width}px`;
        cursor.style.height = `${this.canvasManager.drawingSettings.width}px`;
        cursor.style.backgroundColor = this.canvasManager.drawingSettings.color;
    }
}

// グローバルにクラスを公開
window.DrawMode = DrawMode;