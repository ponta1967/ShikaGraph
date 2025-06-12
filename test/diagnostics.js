// diagnostics.js - ShikaGraph用包括的なログ収集システム
(function() {
  // 環境検出
  const isFileMaker = window.FileMaker !== undefined || navigator.userAgent.indexOf('FileMaker') !== -1;
  const isiPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // セッションIDを生成
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  
  // 日時文字列を生成（ファイル名用）
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  // デバイスタイプに基づいてログファイルプレフィックスを決定
  let logFilePrefix = 'log';
  if (isFileMaker && isiPad) {
    logFilePrefix = 'iFMGlog';
  } else if (isFileMaker) {
    logFilePrefix = 'MFMlog';
  }
  
  // 最終的なログファイル名を構築
  const logFileName = `${logFilePrefix}_${dateStr}_${sessionId}.txt`;
  
  // デバイス情報を収集
  const deviceInfo = {
    sessionId: sessionId,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    pixelRatio: window.devicePixelRatio,
    isFileMaker: isFileMaker,
    isiPad: isiPad,
    isTouch: isTouch,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer,
    pointerEventsSupported: 'PointerEvent' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    fabricVersion: window.fabric ? fabric.version : 'not loaded'
  };
  
  // ログ収集の制限時間（3分 = 180000ミリ秒）
  const LOG_DURATION = 180000;
  let loggingEnabled = true;
  let startTime = Date.now();
  
  // ログメッセージキュー
  const logQueue = [];
  let isSending = false;
  const MAX_QUEUE_SIZE = 20;  // このサイズになったら送信
  
  // 一定時間後にログ収集を停止
  setTimeout(function() {
    loggingEnabled = false;
    log('ログ収集期間終了（3分経過）', 'system');
    // 残っているログを送信
    sendLogs(true);
  }, LOG_DURATION);
  
  // DOMの状態情報を取得
  function getDOMInfo() {
    const domInfo = {};
    try {
      // キャンバス要素の情報収集
      const canvasEl = document.getElementById('test-canvas');
      if (canvasEl) {
        domInfo.testCanvas = {
          width: canvasEl.width,
          height: canvasEl.height,
          cssWidth: canvasEl.getBoundingClientRect().width,
          cssHeight: canvasEl.getBoundingClientRect().height
        };
      }
      
      // コンテナ情報
      const container = document.getElementById('canvas-container');
      if (container) {
        domInfo.canvasContainer = {
          width: container.clientWidth,
          height: container.clientHeight,
          position: {
            left: container.getBoundingClientRect().left,
            top: container.getBoundingClientRect().top
          }
        };
      }
      
      // 重要な要素の存在確認
      domInfo.criticalElements = {
        saveImage: !!document.getElementById('save-image'),
        saveJson: !!document.getElementById('save-json'),
        loadJson: !!document.getElementById('load-json'),
        statusMessage: !!document.getElementById('status-message'),
        jsonOutput: !!document.getElementById('json-output')
      };
      
      // upper-canvasの確認（Fabric.jsが作成する）
      const upperCanvas = document.querySelector('.upper-canvas');
      if (upperCanvas) {
        domInfo.upperCanvas = {
          width: upperCanvas.width,
          height: upperCanvas.height,
          cssWidth: upperCanvas.getBoundingClientRect().width,
          cssHeight: upperCanvas.getBoundingClientRect().height,
          style: {
            touchAction: upperCanvas.style.touchAction,
            userSelect: upperCanvas.style.userSelect,
            position: upperCanvas.style.position
          }
        };
      }
      
      // ボタン情報
      const buttons = document.querySelectorAll('button');
      domInfo.buttons = {
        count: buttons.length,
        ids: Array.from(buttons).map(btn => btn.id || 'no-id')
      };
      
    } catch (e) {
      domInfo.error = e.message;
    }
    
    return domInfo;
  }
  
  // Fabric.js情報を取得
  function getFabricInfo() {
    const fabricInfo = {};
    try {
      if (window.fabric) {
        fabricInfo.version = fabric.version;
        fabricInfo.isTouchSupported = fabric.isTouchSupported;
        fabricInfo.isLikelyNode = fabric.isLikelyNode;
        
        // canvas情報
        if (window.canvas) {
          fabricInfo.canvas = {
            width: canvas.width,
            height: canvas.height,
            isDrawingMode: canvas.isDrawingMode,
            allowTouchScrolling: canvas.allowTouchScrolling,
            selection: canvas.selection,
            interactive: canvas.interactive,
            skipTargetFind: canvas.skipTargetFind,
            objectCount: canvas.getObjects().length
          };
          
          // ブラシ情報
          if (canvas.freeDrawingBrush) {
            fabricInfo.brush = {
              width: canvas.freeDrawingBrush.width,
              color: canvas.freeDrawingBrush.color,
              type: canvas.freeDrawingBrush.constructor.name
            };
          }
        }
      } else {
        fabricInfo.error = 'Fabric.js not loaded';
      }
    } catch (e) {
      fabricInfo.error = e.message;
    }
    
    return fabricInfo;
  }
  
  // ログ送信用関数
  function sendLogs(isFinal = false) {
    if (isSending || logQueue.length === 0) return;
    
    isSending = true;
    const logsToSend = [...logQueue];
    logQueue.length = 0;  // キューをクリア
    
    // 経過時間を計算
    const elapsedTime = Date.now() - startTime;
    
    // ログデータをフォーマット
    const logData = {
      device: deviceInfo,
      logs: logsToSend,
      isFinal: isFinal,
      elapsedTime: elapsedTime,
      domInfo: getDOMInfo(),
      fabricInfo: getFabricInfo()
    };
    
    // サーバーにログを送信
    fetch(`logHandler.php?file=${logFileName}${isFinal ? '&final=1' : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    })
    .then(response => {
      if (!response.ok) {
        console.error('ログの送信に失敗しました', response.status, response.statusText);
      }
      return response.json();
    })
    .then(data => {
      console.log('ログ送信結果:', data);
    })
    .catch(error => {
      console.error('ログ送信エラー:', error);
    })
    .finally(() => {
      isSending = false;
      // 最終ログでなく、キューにまだログがあれば続けて送信
      if (!isFinal && logQueue.length >= MAX_QUEUE_SIZE) {
        sendLogs();
      }
    });
  }
  
  // ログ関数を定義
  function log(message, type = 'info', data = null) {
    if (!loggingEnabled && type !== 'system') return;
    
    const timestamp = new Date().toISOString();
    const elapsedTime = Date.now() - startTime;
    
    const logEntry = {
      timestamp: timestamp,
      elapsed: elapsedTime,
      type: type,
      message: message,
      data: data ? JSON.stringify(data).substring(0, 1000) : null  // データを1000文字までに制限
    };
    
    // コンソールにも出力（開発時に便利）
    console.log(`[${type}] ${message}`, data);
    
    // キューに追加
    logQueue.push(logEntry);
    
    // キューが一定サイズになったら送信
    if (logQueue.length >= MAX_QUEUE_SIZE) {
      sendLogs();
    }
  }
  
  // エラーログ関数
  function logError(error, context = '') {
    const errorData = {
      message: error.message || String(error),
      stack: error.stack,
      context: context,
      time: new Date().toISOString(),
      domState: getDOMInfo(),
      fabricState: getFabricInfo()
    };
    
    log(`エラー: ${errorData.message}`, 'error', errorData);
  }
  
  // イベントログ関数
  function logEvent(eventType, x, y, extra = null) {
    const eventData = {
      x: Math.round(x),
      y: Math.round(y),
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      extra: extra
    };
    
    log(`イベント: ${eventType}`, 'event', eventData);
  }
  
  // グローバルイベントの監視
  function setupGlobalEventLogging() {
    try {
      // test-canvas 要素を取得
      const testCanvas = document.getElementById('test-canvas');
      if (!testCanvas) {
        setTimeout(setupGlobalEventLogging, 1000);
        return;
      }
      
      log('グローバルイベントロギングを設定', 'system');
      
      // Fabric.jsのupper-canvasを取得
      const upperCanvas = document.querySelector('.upper-canvas');
      const targetElement = upperCanvas || testCanvas;
      
      // ポインターイベントの監視
      targetElement.addEventListener('pointerdown', function(e) {
        const rect = targetElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        logEvent('pointerdown', x, y, {
          pointerType: e.pointerType,
          pointerId: e.pointerId,
          pressure: e.pressure,
          drawingMode: window.canvas ? window.canvas.isDrawingMode : 'unknown'
        });
      });
      
      targetElement.addEventListener('pointerup', function(e) {
        const rect = targetElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        logEvent('pointerup', x, y, {
          pointerType: e.pointerType,
          pointerId: e.pointerId
        });
      });
      
      // モードボタンの監視
      const drawModeBtn = document.getElementById('draw-mode');
      if (drawModeBtn) {
        drawModeBtn.addEventListener('click', function() {
          log('描画モードボタンクリック', 'ui', {
            canvasDrawingMode: window.canvas ? window.canvas.isDrawingMode : null
          });
        });
      }
      
      const selectModeBtn = document.getElementById('select-mode');
      if (selectModeBtn) {
        selectModeBtn.addEventListener('click', function() {
          log('選択モードボタンクリック', 'ui', {
            canvasDrawingMode: window.canvas ? window.canvas.isDrawingMode : null
          });
        });
      }
      
      // グローバルエラー監視
      window.addEventListener('error', function(e) {
        logError(e.error || new Error(e.message), 'グローバルエラー');
      });
      
      // Promise エラー監視
      window.addEventListener('unhandledrejection', function(e) {
        logError(e.reason || new Error('Unhandled Promise rejection'), 'Promise エラー');
      });
      
      log('グローバルイベントロギングを有効化しました', 'system');
    } catch (err) {
      log('グローバルイベントロギング設定エラー', 'error', {
        message: err.message,
        stack: err.stack
      });
    }
  }
  
  // Fabric.jsイベントの監視
  function setupFabricEventLogging() {
    try {
      if (!window.canvas) {
        setTimeout(setupFabricEventLogging, 1000);
        return;
      }
      
      log('Fabric.jsイベントロギングを設定', 'system');
      
      // パス作成イベント
      canvas.on('path:created', function(e) {
        log('パス描画完了', 'fabric', {
          path: {
            points: e.path.path.length,
            color: e.path.stroke,
            width: e.path.strokeWidth
          }
        });
      });
      
      // オブジェクト選択イベント
      canvas.on('selection:created', function(e) {
        log('オブジェクト選択', 'fabric', {
          selected: e.selected ? e.selected.length : 0,
          objects: e.selected ? e.selected.map(obj => obj.type) : []
        });
      });
      
      // オブジェクト修正イベント
      canvas.on('object:modified', function(e) {
        log('オブジェクト修正', 'fabric', {
          type: e.target.type,
          position: {
            left: Math.round(e.target.left),
            top: Math.round(e.target.top)
          }
        });
      });
      
      log('Fabric.jsイベントロギングを有効化しました', 'system');
    } catch (err) {
      log('Fabric.jsイベントロギング設定エラー', 'error', {
        message: err.message,
        stack: err.stack
      });
    }
  }
  
  // 30秒ごとにキューを確認して送信
  const logInterval = setInterval(function() {
    if (logQueue.length > 0) {
      sendLogs();
    }
    
    if (!loggingEnabled) {
      clearInterval(logInterval);
    }
  }, 30000);  // 30秒ごと
  
  // 重要なDOM要素をチェック
  function checkCriticalElements() {
    const criticalElementIds = [
      'save-image', 'save-json', 'load-json', 'draw-mode', 'select-mode',
      'status-message', 'test-canvas', 'canvas-container'
    ];
    
    const results = {};
    criticalElementIds.forEach(id => {
      const element = document.getElementById(id);
      results[id] = {
        exists: !!element,
        tagName: element ? element.tagName : null
      };
    });
    
    log('重要DOM要素チェック', 'dom', results);
    
    // Fabric.js関連のDOM要素チェック
    const fabricElements = {
      upperCanvas: !!document.querySelector('.upper-canvas'),
      lowerCanvas: !!document.querySelector('.lower-canvas'),
      canvasContainer: !!document.querySelector('.canvas-container')
    };
    
    log('Fabric.js DOM要素チェック', 'dom', fabricElements);
  }
  
  // 初期化
  function init() {
    try {
      log('診断ログ開始', 'system', deviceInfo);
      
      // 重要な要素をチェック
      setTimeout(checkCriticalElements, 500);
      
      // ポインターイベント対応状況を記録
      log('ポインターイベント対応状況', 'info', {
        supportsPointerEvents: 'PointerEvent' in window,
        maxTouchPoints: navigator.maxTouchPoints,
        isPencilSupported: navigator.maxTouchPoints > 1
      });
      
      // save-image要素のチェックを重点的に行う
      const saveImageElement = document.getElementById('save-image');
      log('save-image要素チェック', 'info', {
        exists: !!saveImageElement,
        tagName: saveImageElement ? saveImageElement.tagName : null,
        parentElement: saveImageElement ? saveImageElement.parentElement ? saveImageElement.parentElement.tagName : null : null,
        querySelectorResult: !!document.querySelector('[id="save-image"]')
      });
      
      // グローバルイベントロギングの設定
      setupGlobalEventLogging();
      
      // Fabric.jsイベントロギングの設定
      setupFabricEventLogging();
      
      // Fabric.jsの状態を定期的にログ
      const fabricCheckInterval = setInterval(function() {
        if (window.fabric && window.canvas) {
          log('Fabric.js状態チェック', 'fabric', getFabricInfo());
        }
        
        if (!loggingEnabled) {
          clearInterval(fabricCheckInterval);
        }
      }, 10000);  // 10秒ごと
    } catch (err) {
      log('初期化エラー', 'error', {
        message: err.message,
        stack: err.stack
      });
    }
  }
  
  // 初期ログ送信
  function sendInitialLog() {
    log('ページ読み込み完了', 'system');
    
    // DOM構造をログに記録
    log('DOM構造', 'info', getDOMInfo());
    
    // すぐに送信
    sendLogs();
  }
  
  // グローバルに公開
  window.diagnosticsLogger = {
    log: log,
    logError: logError,
    logEvent: logEvent,
    getDOMInfo: getDOMInfo,
    getFabricInfo: getFabricInfo,
    
    // ログ収集を手動で停止する関数
    stopLogging: function() {
      loggingEnabled = false;
      log('ログ収集手動停止', 'system');
      sendLogs(true);
      return '診断ログ収集を停止しました';
    },
    
    // 手動でログを送信する関数
    flushLogs: function() {
      log('手動ログ送信', 'system');
      sendLogs();
      return `${logQueue.length}件のログを送信しました`;
    },
    
    // 現在のセッション情報を取得
    getSessionInfo: function() {
      return {
        sessionId: sessionId,
        fileName: logFileName,
        elapsedTime: Date.now() - startTime,
        loggingEnabled: loggingEnabled,
        queuedLogs: logQueue.length
      };
    },
    
    // 現在のDOM状態をログに記録
    logCurrentState: function() {
      log('手動DOM状態記録', 'info', getDOMInfo());
      log('手動Fabric状態記録', 'info', getFabricInfo());
      sendLogs();
      return 'DOM状態とFabric状態を記録しました';
    },
    
    // save-image要素を手動チェック
    checkSaveImage: function() {
      const saveImageElement = document.getElementById('save-image');
      log('save-image手動チェック', 'info', {
        exists: !!saveImageElement,
        tagName: saveImageElement ? saveImageElement.tagName : null,
        id: saveImageElement ? saveImageElement.id : null,
        classes: saveImageElement ? saveImageElement.className : null,
        style: saveImageElement ? saveImageElement.style.cssText : null,
        attributes: saveImageElement ? Array.from(saveImageElement.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ') : null
      });
      sendLogs();
      return saveImageElement ? 'save-image要素が存在します' : 'save-image要素は存在しません';
    }
  };
  
  // ページ読み込み完了時に初期化
  if (document.readyState === 'complete') {
    init();
    sendInitialLog();
  } else {
    window.addEventListener('load', function() {
      init();
      sendInitialLog();
    });
  }
  
  // ページ離脱時に最終ログを送信
  window.addEventListener('beforeunload', function() {
    log('ページ離脱', 'system');
    // 同期的にログを送信するため、navigator.sendBeaconを使用
    if (navigator.sendBeacon) {
      const finalData = {
        device: deviceInfo,
        logs: [{
          timestamp: new Date().toISOString(),
          elapsed: Date.now() - startTime,
          type: 'system',
          message: 'ページ離脱（最終ログ）',
          data: null
        }],
        isFinal: true,
        domInfo: getDOMInfo(),
        fabricInfo: getFabricInfo()
      };
      navigator.sendBeacon(
        `logHandler.php?file=${logFileName}&final=1`,
        JSON.stringify(finalData)
      );
    }
  });
})();