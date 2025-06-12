/**
 * アイコン管理クラス
 * icons.jsonからアイコンデータを読み込み、UIに表示する機能を提供
 */
class IconManager {
    constructor() {
        this.icons = [];
        this.categorizedIcons = {
            diagnosis: [],
            treatment_plan: [],
            restoration: []
        };
        this.selectedIcon = null;
        this.onIconSelectedCallback = null;
        this.debug = true; // デバッグモード
    }

    /**
     * アイコンデータを読み込む
     * @returns {Promise} 読み込み完了時に解決されるPromise
     */
    async loadIcons() {
        try {
            if (this.debug) console.log('アイコンJSONの読み込みを開始...');
            
            const response = await fetch('assets/icons.json');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            this.icons = await response.json();
            if (this.debug) console.log('アイコンデータの読み込み成功:', this.icons.length + '個のアイコン');
            
            this.categorizeIcons();
            return this.icons;
        } catch (error) {
            console.error('アイコンの読み込みに失敗しました:', error);
            
            // フォールバック: ハードコードされたアイコンデータを使用
            if (this.debug) {
                console.log('フォールバックアイコンデータを使用します');
                this.loadFallbackIcons();
            }
            
            return [];
        }
    }

    /**
     * フォールバック用のアイコンデータを読み込む（デバッグ用）
     */
    loadFallbackIcons() {
        // 最小限のアイコンデータを手動で設定
        this.icons = [
            {
                id: "diagnosis_healthtooth",
                category: "diagnosis",
                name_ja: "健全歯",
                name_en: "HealthTooth",
                file: "diagnosis/healthtooth.png",
                style: "standard",
                bg_color: "#FFFFFF"
            },
            {
                id: "diagnosis_caries",
                category: "diagnosis",
                name_ja: "虫歯",
                name_en: "Caries",
                file: "diagnosis/caries.png",
                style: "standard",
                bg_color: "#FFFFFF"
            }
        ];
        
        this.categorizeIcons();
    }

    /**
     * アイコンをカテゴリごとに分類
     */
    categorizeIcons() {
        // カテゴリごとの配列を初期化
        this.categorizedIcons = {
            diagnosis: [],
            treatment_plan: [],
            restoration: []
        };
        
        // アイコンをカテゴリごとに振り分け
        this.icons.forEach(icon => {
            if (this.categorizedIcons[icon.category]) {
                this.categorizedIcons[icon.category].push(icon);
            }
        });
        
        if (this.debug) {
            console.log('カテゴリ別アイコン数:',
                'diagnosis=' + this.categorizedIcons.diagnosis.length,
                'treatment_plan=' + this.categorizedIcons.treatment_plan.length,
                'restoration=' + this.categorizedIcons.restoration.length
            );
        }
    }

    /**
     * カテゴリ別のアイコンを取得
     * @param {string} category - アイコンのカテゴリ
     * @returns {Array} カテゴリに属するアイコンの配列
     */
    getIconsByCategory(category) {
        return this.categorizedIcons[category] || [];
    }

    /**
     * IDでアイコンを検索
     * @param {string} id - アイコンのID
     * @returns {Object|null} アイコンオブジェクト、見つからない場合はnull
     */
    getIconById(id) {
        return this.icons.find(icon => icon.id === id) || null;
    }

    /**
     * 選択中のアイコンを設定
     * @param {string} iconId - アイコンのID
     */
    selectIcon(iconId) {
        this.selectedIcon = this.getIconById(iconId);
        // 選択状態のUIを更新
        this.updateIconSelection(iconId);
        
        // コールバックがあれば実行
        if (this.onIconSelectedCallback && this.selectedIcon) {
            this.onIconSelectedCallback(this.selectedIcon);
        }
    }

    /**
     * 選択状態のUIを更新
     * @param {string} iconId - 選択されたアイコンのID
     */
    updateIconSelection(iconId) {
        // すべてのアイコンボタンから選択状態を解除
        document.querySelectorAll('.icon-button').forEach(button => {
            button.classList.remove('selected');
        });
        
        // 選択されたアイコンに選択状態のクラスを追加
        const selectedButton = document.querySelector(`.icon-button[data-icon-id="${iconId}"]`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }
    }

    /**
     * UIにアイコンを表示
     */
    renderIcons() {
        this.renderCategoryIcons('diagnosis', 'diagnosisIcons');
        this.renderCategoryIcons('treatment_plan', 'treatmentPlanIcons');
        this.renderCategoryIcons('restoration', 'restorationIcons');
    }

    /**
     * カテゴリごとのアイコンをUIに表示
     * @param {string} category - アイコンのカテゴリ
     * @param {string} containerId - アイコンを表示するコンテナのID
     */
    renderCategoryIcons(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            if (this.debug) console.warn(`コンテナが見つかりません: ${containerId}`);
            return;
        }
        
        // コンテナを空にする
        container.innerHTML = '';
        
        // カテゴリのアイコンを取得
        const icons = this.getIconsByCategory(category);
        
        if (icons.length === 0) {
            if (this.debug) console.warn(`カテゴリ「${category}」のアイコンがありません`);
            container.innerHTML = '<div class="no-icons-message">アイコンがありません</div>';
            return;
        }
        
        // 各アイコンをUIに追加
        icons.forEach(icon => {
            try {
                const button = document.createElement('button');
                button.className = 'icon-button';
                button.setAttribute('data-icon-id', icon.id);
                button.setAttribute('data-icon-file', icon.file);
                button.setAttribute('title', `${icon.name_ja} / ${icon.name_en}`);
                
                // アイコンラッパー（背景色を設定）
                const wrapper = document.createElement('div');
                wrapper.className = 'icon-wrapper';
                wrapper.style.backgroundColor = icon.bg_color || '#FFFFFF';
                
                // アイコン画像
                const img = document.createElement('img');
                // ファイル拡張子をpngに変更（svgからpngへ）
                const filePath = icon.file.replace('.svg', '.png');
                img.src = `assets/${filePath}`;
                img.alt = icon.name_en;
                img.className = 'icon-img';
                
                // 画像の読み込みエラー処理
                img.onerror = () => {
                    if (this.debug) console.warn(`アイコン画像の読み込みに失敗: ${img.src}`);
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWFsZXJ0LXRyaWFuZ2xlIj48cGF0aCBkPSJtMjEuNzMgMTgtOC0xNGEyIDIgMCAwIDAtMy40NiAwbC04IDE0QTIgMiAwIDAgMCA0IDIxaDE2YTIgMiAwIDAgMCAxLjczLTNaIi8+PHBhdGggZD0iTTEyIDl2NEIvPjxwYXRoIGQ9Ik0xMiAxN2guMDEiLz48L3N2Zz4=';
                    img.style.padding = '5px';
                    img.style.opacity = '0.5';
                };
                
                // ラベル
                const label = document.createElement('div');
                label.className = 'icon-label';
                label.textContent = icon.name_ja;
                
                // 要素を組み立て
                wrapper.appendChild(img);
                button.appendChild(wrapper);
                button.appendChild(label);
                
                // クリックイベントを追加
                button.addEventListener('click', () => {
                    this.selectIcon(icon.id);
                });
                
                // コンテナに追加
                container.appendChild(button);
            } catch (error) {
                console.error(`アイコン「${icon.id}」の描画エラー:`, error);
            }
        });
        
        if (this.debug) console.log(`カテゴリ「${category}」のアイコン ${icons.length}個 を描画しました`);
    }

    /**
     * アイコン選択時のコールバックを設定
     * @param {Function} callback - アイコン選択時に呼び出される関数
     */
    setIconSelectedCallback(callback) {
        this.onIconSelectedCallback = callback;
    }
}

// グローバルにクラスを公開
window.IconManager = IconManager;

// シングルトンインスタンスを作成
window.iconManager = new IconManager();