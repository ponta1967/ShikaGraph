/**
 * ShikaGraph ユーティリティ関数
 * 汎用的な補助関数を提供
 */

/**
 * 要素の特定のイベントに一度だけ実行されるリスナーを追加
 * @param {Element} element - イベントを追加する要素
 * @param {string} eventType - イベントタイプ
 * @param {Function} callback - コールバック関数
 */
function addOneTimeEventListener(element, eventType, callback) {
    const oneTimeCallback = function(e) {
        element.removeEventListener(eventType, oneTimeCallback);
        callback(e);
    };
    
    element.addEventListener(eventType, oneTimeCallback);
}

/**
 * 範囲内に値を収める
 * @param {number} value - 対象の値
 * @param {number} min - 最小値
 * @param {number} max - 最大値
 * @returns {number} 範囲内に収められた値
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 2点間の距離を計算
 * @param {number} x1 - 点1のX座標
 * @param {number} y1 - 点1のY座標
 * @param {number} x2 - 点2のX座標
 * @param {number} y2 - 点2のY座標
 * @returns {number} 2点間の距離
 */
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * 色をRGBA形式に変換
 * @param {string} color - 色文字列
 * @param {number} alpha - 透明度（0.0〜1.0）
 * @returns {string} RGBA形式の色文字列
 */
function toRGBA(color, alpha = 1.0) {
    // 基本的な色名を対応するRGB値にマッピング
    const colorMap = {
        'black': [0, 0, 0],
        'white': [255, 255, 255],
        'red': [255, 0, 0],
        'green': [0, 128, 0],
        'blue': [0, 0, 255],
        'yellow': [255, 255, 0],
        'cyan': [0, 255, 255],
        'magenta': [255, 0, 255],
        'gray': [128, 128, 128]
    };
    
    // 色名がマップにある場合はRGB値を取得
    if (colorMap[color.toLowerCase()]) {
        const [r, g, b] = colorMap[color.toLowerCase()];
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // すでにrgbaまたはrgb形式の場合はそのまま返す
    if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
        return color;
    }
    
    // HEX形式の場合はRGBに変換
    if (color.startsWith('#')) {
        let hex = color.slice(1);
        
        // 3桁のHEXコードを6桁に拡張
        if (hex.length === 3) {
            hex = hex.split('').map(h => h + h).join('');
        }
        
        // HEXをRGB値に変換
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // その他の形式はそのまま返す
    return color;
}

/**
 * 現在の日時を「YYYY-MM-DD HH:MM:SS」形式で取得
 * @returns {string} フォーマットされた日時文字列
 */
function getCurrentDateTime() {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * FileMakerとの連携用ユーティリティ
 */
const FileMakerUtils = {
    /**
     * FileMakerスクリプトを実行
     * @param {string} scriptName - スクリプト名
     * @param {string} param - パラメータ
     */
    performScript: function(scriptName, param = '') {
        if (window.FileMaker && typeof window.FileMaker.PerformScript === 'function') {
            window.FileMaker.PerformScript(scriptName, param);
        } else {
            console.warn('FileMaker.PerformScript is not available');
        }
    },
    
    /**
     * モバイル環境かどうかを判定
     * @returns {boolean} モバイル環境の場合はtrue
     */
    isMobileEnvironment: function() {
        // WebViewerでのモバイル判定（iOSやAndroid）
        const userAgent = navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod|android/.test(userAgent);
    },
    
    /**
     * FileMaker環境かどうかを判定
     * @returns {boolean} FileMaker環境の場合はtrue
     */
    isFileMakerEnvironment: function() {
        return window.FileMaker !== undefined;
    }
};