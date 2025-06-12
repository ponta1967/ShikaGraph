/**
 * ShikaGraph デバッグユーティリティ
 * デバッグ関連の機能を提供
 */

// デバッグモードフラグ
const DEBUG_MODE = true;

/**
 * デバッグログユーティリティ
 */
const DebugUtil = {
    /**
     * デバッグモードかどうか
     * @returns {boolean} デバッグモードならtrue
     */
    isDebugMode: function() {
        return DEBUG_MODE;
    },
    
    /**
     * デバッグログを出力
     * @param {string} message - メッセージ
     * @param {any} data - 追加データ（オプション）
     */
    log: function(message, data) {
        if (!this.isDebugMode()) return;
        
        const timestamp = getCurrentDateTime();
        
        if (data !== undefined) {
            console.log(`[${timestamp}] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
    },
    
    /**
     * 警告ログを出力
     * @param {string} message - メッセージ
     * @param {any} data - 追加データ（オプション）
     */
    warn: function(message, data) {
        if (!this.isDebugMode()) return;
        
        const timestamp = getCurrentDateTime();
        
        if (data !== undefined) {
            console.warn(`[${timestamp}] WARNING: ${message}`, data);
        } else {
            console.warn(`[${timestamp}] WARNING: ${message}`);
        }
    },
    
    /**
     * エラーログを出力
     * @param {string} message - メッセージ
     * @param {any} data - 追加データ（オプション）
     */
    error: function(message, data) {
        // エラーはデバッグモードに関わらず常に出力
        const timestamp = getCurrentDateTime();
        
        if (data !== undefined) {
            console.error(`[${timestamp}] ERROR: ${message}`, data);
        } else {
            console.error(`[${timestamp}] ERROR: ${message}`);
        }
    },
    
    /**
     * パフォーマンス計測開始
     * @param {string} label - 計測ラベル
     */
    timeStart: function(label) {
        if (!this.isDebugMode()) return;
        
        console.time(label);
    },
    
    /**
     * パフォーマンス計測終了
     * @param {string} label - 計測ラベル
     */
    timeEnd: function(label) {
        if (!this.isDebugMode()) return;
        
        console.timeEnd(label);
    },
    
    /**
     * オブジェクトの内容を表示
     * @param {string} label - オブジェクトラベル
     * @param {Object} obj - 表示するオブジェクト
     */
    inspectObject: function(label, obj) {
        if (!this.isDebugMode()) return;
        
        console.group(label);
        console.dir(obj);
        console.groupEnd();
    },
    
    /**
     * Fabric.jsキャンバスの状態を表示
     * @param {fabric.Canvas} canvas - Fabricキャンバス
     */
    inspectCanvas: function(canvas) {
        if (!this.isDebugMode() || !canvas) return;
        
        const objects = canvas.getObjects();
        
        console.group('Canvas Inspection');
        console.log(`Total objects: ${objects.length}`);
        
        objects.forEach((obj, index) => {
            console.group(`Object #${index} (${obj.type})`);
            console.log('Position:', { left: obj.left, top: obj.top });
            console.log('Dimensions:', { width: obj.width, height: obj.height });
            if (obj.id) console.log('ID:', obj.id);
            if (obj.data) console.log('Data:', obj.data);
            console.groupEnd();
        });
        
        console.groupEnd();
    }
};