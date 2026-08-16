// AI单词提取和翻译内容脚本
class WordbentoTranslator {

  constructor() {
    this.isActive = false;
    this.translationPanel = null;
    this.currentSubtitles = [];
    this.subtitleObserver = null;
    this.urlObserver = null;
    this.showYtpCaptionContainer = true;
    this.currentSubtitleText = '';
    this.lastUrl = window.location.href;
    this.isInitialized = false;
    this.initDebounceTimer = null;
    this.initRetryCount = 0;
    this.currentVideoId = null;
    this.previousVideoId = null;
    this.accumulatedSubtitle = null; // 当前正在构建的长句
    this.lastPanelHeight = 0; // 缓存上次的浮动层高度，避免不必要的重排
    this.pendingLayoutUpdate = false; // 标志是否已经请求了 rAF 更新，避免重复
    this.init();
  }

  init() {
    console.log('Wordbento单词AI助手插件初始化中...');
    this.startUrlObserver();
    this.bindYouTubeNavigationEvents();

    // 首次页面初始化增加防抖和重试，避免 YouTube 首次进入 watch 页面时丢失启动时机
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.scheduleStart(200), { once: true });
    } else {
      this.scheduleStart(200);
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'addToWordbento') {
        console.log('收到消息:', request.message);
        this.showFloatingWordDefinition(request.word);
      }
    });
  }

  scheduleStart(delay = 150) {
    clearTimeout(this.initDebounceTimer);
    this.initDebounceTimer = setTimeout(() => {
      const currentUrl = window.location.href;
      const isVideoPage = this.isYouTubeVideoPage();

      if (currentUrl !== this.lastUrl) {
        this.lastUrl = currentUrl;
      }

      // YouTube 首次进入页面或 SPA 路由切换时，播放器节点可能还没挂载；这里做有限重试
      const playerReady = !!(document.querySelector('#movie_player') || document.querySelector('ytd-watch'));
      if (isVideoPage && (!playerReady || !this.isInitialized)) {
        this.initRetryCount += 1;
        if (this.initRetryCount <= 12) {
          this.start();
          setTimeout(() => this.scheduleStart(400), 400);
          return;
        }
      }

      this.start();
    }, delay);
  }

  start() {
    console.log('[Wordbento] start() called', {
      href: window.location.href,
      isYouTubeVideoPage: this.isYouTubeVideoPage(),
      currentVideoId: this.currentVideoId,
      isInitialized: this.isInitialized
    });

    if (this.isYouTubeVideoPage()) {
      const playerReady = !!(document.querySelector('#movie_player') || document.querySelector('ytd-watch'));
      if (!playerReady) {
        console.log('[Wordbento] YouTube 播放器尚未就绪，延迟初始化');
        this.scheduleStart(500);
        return;
      }

      const currentVideoId = this.getYouTubeVideoId();
      const previousVideoId = this.currentVideoId;
      const shouldResetForVideoSwitch = !!previousVideoId && !!currentVideoId && previousVideoId !== currentVideoId;

      const panelIsStale = !this.translationPanel || !document.body.contains(this.translationPanel);
      if (!this.isInitialized || panelIsStale || shouldResetForVideoSwitch) {
        console.log('[Wordbento] YouTube 视频切换检测:', { previousVideoId, currentVideoId, panelIsStale, shouldResetForVideoSwitch });
        this.resetForVideoTransition();
        this.currentVideoId = currentVideoId;

        this.createTranslationPanel();
        this.startSubtitleObserver();
        this.addWordClickListener();
        this.addKeyboardListener();

        const that = this;
        this.getSettings()
          .then(settings => {
            console.log('获取到的设置:', settings);
            that.showYtpCaptionContainer = settings.showYtpCaptionContainer;
          })
          .catch(error => {
            console.error('获取设置失败:', error);
          });

        this.isInitialized = true;
      } else {
        if (this.translationPanel) {
          this.translationPanel.style.display = 'block';
        }
        this.currentSubtitles = [];
        this.currentSubtitleText = '';
        this.currentVideoId = currentVideoId;
        setTimeout(() => this.extractSubtitles(), 500);
      }
    } else {
      this.resetForVideoTransition();
      this.isInitialized = false;
    }
  }

  bindYouTubeNavigationEvents() {
    const handleNavigation = () => {
      const url = window.location.href;
      const nextVideoId = this.getYouTubeVideoId();
      const previousVideoId = this.currentVideoId;

      console.log('[Wordbento] navigation event fired', {
        url,
        previousVideoId,
        nextVideoId,
        isYouTubeVideoPage: this.isYouTubeVideoPage()
      });

      if (nextVideoId && previousVideoId && previousVideoId !== nextVideoId) {
        console.log('[Wordbento] 检测到新视频导航:', { previousVideoId, nextVideoId, url });
        this.resetForVideoTransition();
      }

      this.scheduleStart(150);
    };

    window.addEventListener('yt-navigate-start', handleNavigation);
    window.addEventListener('yt-navigate-finish', handleNavigation);
    window.addEventListener('yt-page-data-updated', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
  }

  getYouTubeVideoId() {
    try {
      const url = new URL(window.location.href);
      if (url.hostname === 'youtu.be') {
        return url.pathname.replace('/', '').split('/')[0] || null;
      }
      return url.searchParams.get('v') || null;
    } catch (error) {
      return null;
    }
  }

  resetForVideoTransition() {
    console.log('[Wordbento] resetForVideoTransition start', {
      currentVideoId: this.currentVideoId,
      previousVideoId: this.previousVideoId,
      translationPanelExists: !!this.translationPanel,
      subtitleObserverExists: !!this.subtitleObserver
    });

    this.lastPanelHeight = 0;
    this.pendingLayoutUpdate = false;

    if (this.translationPanel && this.translationPanel.parentNode) {
      this.translationPanel.remove();
    }
    this.translationPanel = null;

    if (this.subtitleObserver) {
      this.subtitleObserver.disconnect();
      this.subtitleObserver = null;
    }

    document.querySelectorAll('.word-definition-popup').forEach(el => el.remove());
    this.currentSubtitles = [];
    this.accumulatedSubtitle = null;
    this.currentSubtitleText = '';

    this.isInitialized = false;
    console.log('[Wordbento] resetForVideoTransition complete');
  }

  // ==========================================================
  // 关键修复：监听 URL 变化以处理 YouTube SPA 导航
  // ==========================================================
  startUrlObserver() {
    if (this.urlObserver) return;

    console.log('Wordbento: 启动 URL 变化观察者');

    const checkUrl = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        console.log('Wordbento: 检测到 URL 变化:', this.lastUrl, '->', currentUrl);
        this.lastUrl = currentUrl;
        this.scheduleStart(100);
      }
    };

    const patchHistoryMethod = (methodName) => {
      const originalMethod = history[methodName];
      history[methodName] = function (...args) {
        const result = originalMethod.apply(this, args);
        setTimeout(checkUrl, 0);
        return result;
      };
    };

    patchHistoryMethod('pushState');
    patchHistoryMethod('replaceState');

    window.addEventListener('popstate', checkUrl);
    window.addEventListener('hashchange', checkUrl);
    window.addEventListener('yt-navigate-finish', checkUrl);

    this.urlObserver = { checkUrl };
  }

  isYouTubeVideoPage() {
    try {
      const url = new URL(window.location.href);
      const isYouTubeHost = url.hostname === 'www.youtube.com' || url.hostname === 'm.youtube.com' || url.hostname === 'youtube.com';
      const isWatchPage = isYouTubeHost && url.pathname === '/watch' && url.searchParams.has('v');
      const isShortLink = url.hostname === 'youtu.be' && url.pathname.length > 1;
      return isWatchPage || isShortLink;
    } catch (error) {
      return window.location.href.includes('/watch?v=');
    }
  }

  createTranslationPanel() {
    // 创建翻译面板容器
    this.translationPanel = document.createElement('div');
    this.translationPanel.id = 'yt-translation-panel';
    this.translationPanel.className = 'yt-translation-panel';
    
    this.translationPanel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">Wordbento 单词AI助手</span>
        <div class="panel-controls">
          <button id="toggle-pin" class="control-btn" title="固定面板">📌</button>
          <button id="toggle-minimize" class="control-btn" title="最小化">➖</button>
          <button id="toggle-close" class="control-btn" title="关闭">✖️</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="subtitle-container">
          <div class="original-text" id="original-text">等待字幕加载...</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.translationPanel);
    this.makeDraggable();
    this.addPanelEventListeners();
  }

  makeDraggable() {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    
    const header = this.translationPanel.querySelector('.panel-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('control-btn')) return;
      
      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      
      if (e.target === header || header.contains(e.target)) {
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
      }
    });
    
    const dragMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        this.translationPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    };
    
    const dragEnd = () => {
      isDragging = false;
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', dragEnd);
    };
  }

  addPanelEventListeners() {
    // 关闭按钮
    document.getElementById('toggle-close').addEventListener('click', () => {
      this.translationPanel.style.display = 'none';
    });
    
    // 最小化按钮
    document.getElementById('toggle-minimize').addEventListener('click', () => {
      const content = this.translationPanel.querySelector('.panel-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
    
    // 固定按钮
    document.getElementById('toggle-pin').addEventListener('click', (e) => {
      this.translationPanel.classList.toggle('pinned');
      e.target.textContent = this.translationPanel.classList.contains('pinned') ? '📍' : '📌';
    });
  }

  startSubtitleObserver() {
    if (this.subtitleObserver) {
        this.subtitleObserver.disconnect();
        this.subtitleObserver = null;
    } 
    // 监听YouTube字幕容器
    // const subtitleSelector = '.caption-window, .ytp-caption-window-container, [class*="caption"]';
    
    // 添加防抖优化
    let subtitleTimeout;    
    this.subtitleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // if (mutation.type === 'childList' || mutation.type === 'characterData') {
        if (mutation.type === 'childList') {
          // this.extractSubtitles();
          // 防抖处理，避免频繁调用
          clearTimeout(subtitleTimeout);
          subtitleTimeout = setTimeout(() => {
            this.extractSubtitles();
          }, 100); // 100ms 防抖间隔          
        }
      });
    });
    
    // 开始观察
    const targetNode = document.querySelector('#movie_player') || document.body;
    this.subtitleObserver.observe(targetNode, {
      childList: true,
      subtree: true,
      // characterData: true  // 移除这个，因为它会极大地增加性能开销，用 childList 和防抖通常足够抓取字幕变化
    });
    
    // 立即尝试提取一次字幕
    setTimeout(() => this.extractSubtitles(), 2000);
  }

  extractSubtitles() {
    let subtitleText = '';
    // 尝试定位行级容器而非单词级元素
    // 优化后的选择器，优先抓取行级容器
    const lineSelectors = [
      '[id*="caption-line"]', // 特定ID模式
      '.caption-visual-line', // 视觉行
      '.ytp-caption-segment', // 字幕片段
      '[data-line]' // 通用数据属性
    ];

    if (!this.showYtpCaptionContainer) {
      const captionContainer = document.querySelector('#ytp-caption-window-container');
      if (captionContainer && captionContainer.style.visibility !== 'hidden') {
        captionContainer.style.visibility = 'hidden';
      }
    }

    for (const selector of lineSelectors) {
      const lines = document.querySelectorAll(selector);
      if (lines.length > 0) {
        subtitleText = Array.from(lines)
          .map(line => {
            // 提取行内所有文本内容
            return line.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
          })
          .filter(text => text.length > 0)
          .join(' '); // 行与行之间用空格连接
        break;
      }
    }
    
    if (subtitleText && subtitleText !== this.currentSubtitleText) {
      this.currentSubtitleText = subtitleText;
      this.updateSubtitleDisplay(subtitleText);
      // this.translateText(subtitleText);
    }
  }

  updateSubtitleDisplay(text) {
    console.log('[Wordbento] 更新字幕显示:', text);
    const originalTextEl = document.getElementById('original-text');
    console.log('[Wordbento] subtitle target element', {
      found: !!originalTextEl,
      inDom: !!(originalTextEl && originalTextEl.isConnected),
      currentSubtitlesLength: this.currentSubtitles.length,
      currentVideoId: this.currentVideoId
    });

    if (originalTextEl) {
      const highlightedText = this.highlightWords(text);
      this.addToCurrentSubtitles({ text, html: highlightedText, raw: text });

      // 构建显示内容：历史 + 当前正在构建的长句
      const displayItems = [...this.currentSubtitles];
      if (this.accumulatedSubtitle) {
        displayItems.push(this.accumulatedSubtitle);
      }

      // 为每个字幕项包装成 div，便于后续高亮
      let combinedDisplay = displayItems
        .map((d, idx) => {
          const escapedRaw = (d.raw || '').replace(/"/g, '&quot;');
          return `<div class="subtitle-item" data-subtitle-idx="${idx}" data-raw-text="${escapedRaw}">${d.html}</div>`;
        })
        .join('<hr>');

      // 在">>"处换行，使其更清晰
      combinedDisplay = combinedDisplay.replace(/>>/g, '<br><strong>>></strong>');

      // 如果内容过长，确保只从完整的 HTML 标签后面开始（不会残破显示）
      const MAX_DISPLAY_LENGTH = 3000;
      let boundedDisplay = combinedDisplay;
      if (combinedDisplay.length > MAX_DISPLAY_LENGTH) {
        // 从末尾往前找，找到第一个完整的 > 符号
        const start = combinedDisplay.length - MAX_DISPLAY_LENGTH;
        const firstCompleteTagPos = combinedDisplay.indexOf('>', start);
        if (firstCompleteTagPos >= 0) {
          boundedDisplay = combinedDisplay.substring(firstCompleteTagPos + 1);
        } else {
          // 如果找不到 >，就直接从 start 开始（虽然可能会有残破标签，但尽力了）
          boundedDisplay = combinedDisplay.substring(start);
        }
      }

      // 只更新内容一次，避免重复 DOM 操作导致闪烁
      if (originalTextEl.innerHTML !== boundedDisplay) {
        originalTextEl.innerHTML = boundedDisplay;
        console.log('[Wordbento] rendered subtitle html to DOM');

        // 使用 requestAnimationFrame 在下一个渲染帧中批量处理高度和样式更新
        // 这样浏览器可以在一个帧中完成所有计算，避免多次重排
        if (this.pendingLayoutUpdate) return; // 避免重复请求
        
        this.pendingLayoutUpdate = true;
        requestAnimationFrame(() => {
          this.pendingLayoutUpdate = false;

          const contentHeight = originalTextEl.scrollHeight;
          const maxContentHeight = 500;
          const needsScroll = contentHeight > maxContentHeight;
          
          // 批量更新所有样式（一次性赋值）
          originalTextEl.style.maxHeight = maxContentHeight + 'px';
          originalTextEl.style.overflowY = needsScroll ? 'auto' : 'visible';

          // 自动滚动到底部（只在必要时）
          if (needsScroll) {
            originalTextEl.scrollTop = originalTextEl.scrollHeight;
          }

          // 调整浮动层高度（仅当数值变化时更新）
          if (this.translationPanel) {
            const headerHeight = 48;
            const panelContentPadding = 32;
            const calculatedHeight = Math.min(contentHeight + headerHeight + panelContentPadding, maxContentHeight + headerHeight + panelContentPadding);
            const maxScreenHeight = Math.floor(window.innerHeight * 0.8);
            const finalHeight = Math.min(calculatedHeight, maxScreenHeight);
            
            if (this.lastPanelHeight !== finalHeight) {
              this.translationPanel.style.height = finalHeight + 'px';
              this.lastPanelHeight = finalHeight;
            }
          }
        });
      }

      console.log('[Wordbento] before render check', {
        sameHtml: originalTextEl.innerHTML === boundedDisplay,
        combinedDisplayLength: combinedDisplay.length,
        boundedDisplayLength: boundedDisplay.length,
        currentHtmlLength: originalTextEl.innerHTML.length
      });
    }
  }

  highlightWords(text) {
    // 将英文单词包装在span中，便于点击选择
    return text.replace(/\b[a-zA-Z]+\b/g, '<span class="clickable-word">$&</span>');
  }

  highlightCurrentSubtitle(container) {
    // 不再手动高亮 - 改用 CSS 自动高亮最后一项
    // 这样避免了每次都调用 querySelectorAll 和频繁的 classList 操作
    // CSS 的 :last-child 伪选择器性能远优于 JavaScript
  }

  /**
   * 基于字符的重叠检测（更快速）
   */
  findCharacterOverlap(previous, next) {
    const maxOverlap = Math.min(previous.length, next.length);
    
    for (let i = maxOverlap; i > 0; i--) {
      const prevEnd = previous.substring(previous.length - i);
      const nextStart = next.substring(0, i);
      
      if (prevEnd === nextStart) {
        return i; // 返回重叠字符数
      }
    }
    
    return 0;
  }

  getTailText(previous, text) {
    let tailText = null;
    // 寻找重叠的文本
    const nextStart = this.findCharacterOverlap(previous, text);
    if (nextStart > 0) {
      // 去除最后一条字幕的开头重叠部分
      tailText = text.substring(nextStart)
    } else {
      // 完全不同的
      tailText = text;
    }
    return {text: tailText, isNew: nextStart == 0};
  }

  // 新增方法：管理固定长度的字幕历史记录
  addToCurrentSubtitles(textAndHtml) {
    if (!this.currentSubtitles) {
      this.currentSubtitles = [];
    }

    const text = (textAndHtml && textAndHtml.text) || '';
    if (!text) {
      return;
    }

    // 如果当前没有在构建的长句，初始化
    if (!this.accumulatedSubtitle) {
      this.accumulatedSubtitle = {
        text: text,
        html: this.highlightWords(text),
        raw: text
      };
      return;
    }

    const lastRaw = this.accumulatedSubtitle.raw;

    // 完全相同则忽略
    if (lastRaw === text) {
      return;
    }

    // 检测新字幕是否是上一条的延续
    if (text.startsWith(lastRaw)) {
      // 提取真正新增的部分，追加到当前长句
      const newPart = text.substring(lastRaw.length).trim();
      if (newPart) {
        this.accumulatedSubtitle = {
          text: this.accumulatedSubtitle.text + ' ' + newPart,
          html: this.highlightWords(this.accumulatedSubtitle.text + ' ' + newPart),
          raw: text
        };
      }
    } else {
      // 不是标准延续，检查是否有重叠或短词
      const overlapIndex = this.findOverlapIndex(lastRaw, text);
      
      // 如果找到重叠或新字幕是短词，当作延续处理
      if (overlapIndex > 0 || text.length <= 15) {
        let newPart;
        if (overlapIndex > 0) {
          newPart = text.substring(overlapIndex).trim();
        } else {
          // 没有直接重叠但新字幕很短（单词），直接作为新增部分
          newPart = text;
        }

        if (newPart) {
          this.accumulatedSubtitle = {
            text: this.accumulatedSubtitle.text + ' ' + newPart,
            html: this.highlightWords(this.accumulatedSubtitle.text + ' ' + newPart),
            raw: text
          };
        }
      } else {
        // 完全不同且长度较长，说明是新的独立字幕行
        // 把当前长句保存到历史，开始新的长句
        this.currentSubtitles.push(this.accumulatedSubtitle);

        this.accumulatedSubtitle = {
          text: text,
          html: this.highlightWords(text),
          raw: text
        };

        if (this.currentSubtitles.length > 5) {
          this.currentSubtitles.shift();
        }
      }
    }
  }

  // 查找新字幕中与上一条字幕的重叠位置（后缀匹配）
  findOverlapIndex(previous, current) {
    if (!previous || previous.length < 3) return 0;

    // 从上一条字幕的最后开始，尝试在新字幕中找到匹配的位置
    // 最少匹配3个字符，避免误判
    const minOverlap = Math.min(previous.length, 15); // 最多检查前面的15个字符
    
    for (let i = minOverlap; i >= 3; i--) {
      const tail = previous.slice(-i);
      const idx = current.indexOf(tail);
      if (idx >= 0) {
        // 找到匹配，返回新字幕中这个匹配后的位置
        return idx + tail.length;
      }
    }

    return 0;
  }

  // async translateText(text) {
  //   try {
  //     const translatedText = await this.callTranslationAPI(text);
  //     const translatedTextEl = document.getElementById('translated-text');
  //     if (translatedTextEl) {
  //       translatedTextEl.textContent = translatedText;
  //     }
  //   } catch (error) {
  //     console.error('翻译失败:', error);
  //     const translatedTextEl = document.getElementById('translated-text');
  //     if (translatedTextEl) {
  //       translatedTextEl.textContent = '翻译失败，请稍后重试';
  //     }
  //   }
  // }

  // async callTranslationAPI(text) {
  //   try {
  //     // 使用后台脚本进行翻译
  //     const response = await chrome.runtime.sendMessage({
  //       action: 'translate',
  //       text: text,
  //       targetLang: 'zh'
  //     });
      
  //     if (response && response.success) {
  //       return response.translation;
  //     } else {
  //       throw new Error(response.error || '翻译服务响应错误');
  //     }
  //   } catch (error) {
  //     console.error('调用翻译API失败:', error);
  //     // 备用翻译方案：直接调用Google翻译
  //     return await this.fallbackTranslation(text);
  //   }
  // }

  getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve(result.settings || {});
      });
    });
  }

  addWordClickListener() {
    console.log('添加单词点击监听器');
    document.addEventListener('click', (e) => {
      console.log('点击事件触发:', e.target);
      if (e.target.classList.contains('clickable-word')) {
        console.log('点击了可点击单词:', e.target.textContent);
        const word = e.target.textContent.trim();
        this.showWordDefinition(word, e.pageX, e.pageY);
      }
    });
  }

  getActualTranslateValues(element) {
      const style = window.getComputedStyle(element);
      const matrix = style.transform;
      
      // 如果没有 transform，则返回 0
      if (matrix === 'none') {
          return { x: 0, y: 0 };
      }

      // 提取矩阵中的值
      // matrix(a, b, c, d, tx, ty)
      const matrixValues = matrix.match(/matrix.*\((.+)\)/)[1].split(', ');
      
      // 对于 matrix(a, b, c, d, tx, ty) 形式，tx 是第 5 个值 (索引 4)，ty 是第 6 个值 (索引 5)
      // 对于 matrix3d 形式，tx 是第 13 个值 (索引 12)，ty 是第 14 个值 (索引 13)
      const is3d = matrixValues.length === 16; 
      
      const x = parseFloat(matrixValues[is3d ? 12 : 4]);
      const y = parseFloat(matrixValues[is3d ? 13 : 5]);
      
      return { x, y };
  }

  getPanelScreenCoordinates() {
      if (!this.translationPanel) {
          return null;
      }

      // 1. 获取元素原始的矩形边界信息 (相对于视口)
      const rect = this.translationPanel.getBoundingClientRect();
      
      // // 2. 获取当前的 translate 偏移量
      // // 使用您的 makeDraggable 中维护的 currentX 和 currentY 是最简单且最精确的方法。
      // // 如果您在 makeDraggable 中将它们存储在类属性中，可以直接访问：
      // // const offsetX = this.currentX || 0; 
      // // const offsetY = this.currentY || 0; 

      // // **或者，使用 getActualTranslateValues 函数（如上所述）**
      // const translate = this.getActualTranslateValues(this.translationPanel);
      // const offsetX = translate.x;
      // const offsetY = translate.y;


      // // 3. 计算最终的视口坐标
      // const screenX = rect.left + offsetX;
      // const screenY = rect.top + offsetY;

      // // 4. 计算最终的文档坐标 (相对于整个网页)
      // const documentX = screenX + window.scrollX;
      // const documentY = screenY + window.scrollY;

      return {
          screenX: rect.left,
          screenY: rect.top,
          // documentX: documentX,
          // documentY: documentY
      };
  }

  showWordDefinition(word, x, y) {
    // 移除已存在的定义弹窗
    const existingPopup = document.querySelector('.word-definition-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // 创建单词定义弹窗
    const popup = document.createElement('div');
    popup.className = 'word-definition-popup';
    // popup.style.left = x + 'px';
    const panelPos = this.getPanelScreenCoordinates();
    if (panelPos) {
      popup.style.left = (panelPos.screenX + ((x - panelPos.screenX)/2)) + 'px';
    } else {
      popup.style.left = x + 'px';
    }
    popup.style.top = (y + 18) + 'px';
    popup.innerHTML = `
      <div class="word-header">
        <span class="word-text">${word}</span>
        <button class="close-btn">×</button>
      </div>
      <div class="word-content">
        <div class="loading">加载中...</div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // 关闭按钮事件
    popup.querySelector('.close-btn').addEventListener('click', () => {
      popup.remove();
    });
    
    // 点击其他地方关闭
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
    
    // 获取单词定义
    this.fetchWordDefinition(word, popup);
  }

  async fetchWordDefinition(word, popup) {
    try {
      // 调用后台脚本获取单词定义
      const response = await chrome.runtime.sendMessage({
        action: 'getWordDefinition',
        word: word
      });
      
      let definition;
      if (response && response.success) {
        definition = response.definition;
      } else {
        // 使用备用定义
        definition = {
          word: word,
          phonetic: '',
          meanings: '暂时无法获取该单词的定义，请稍后重试。'
        };
      }
      
      const content = popup.querySelector('.word-content');
      content.innerHTML = `
        <div class="phonetic">${definition.phonetic || ''}</div>
        <div class="meanings">${definition.meaning || ''}</div>
      `;
      
    } catch (error) {
      console.error('获取单词定义失败:', error);
      popup.querySelector('.word-content').innerHTML = '<div class="error">获取定义失败，请稍后重试</div>';
    }
  }

  // async addToWordbook(word, definition) {
  //   console.log('尝试添加单词到生词本:', word, definition);
  //   try {
  //     const response = await chrome.runtime.sendMessage({
  //       action: 'saveToWordbook',
  //       word: word,
  //       definition: definition
  //     });
      
  //     console.log('后台脚本响应:', response);
      
  //     if (response && response.success) {
  //       // 显示成功提示
  //       console.log('显示成功提示');
  //       this.showMessage(`"${word}" 已添加到生词本`, 'success');
  //     } else {
  //       console.log('保存失败:', response);
  //       this.showMessage('添加到生词本失败', 'error');
  //     }
  //   } catch (error) {
  //     console.error('添加到生词本失败:', error);
  //     this.showMessage('添加到生词本失败', 'error');
  //   }
  // }


  // 显示浮动提示框的核心函数
  showFloatingWordDefinition(word) {
    // 获取用户选中的文本范围
    const selection = window.getSelection();
    let rect;
    if (selection.rangeCount === 0) {
      // 如果没有选中范围，尝试用其他方式定位，例如在页面中央显示
      rect = {
        x: window.pageXOffset + 100,
        y: window.pageYOffset + 100,
        width: 24,
        height: 12,
      }
    } else {
      // 获取选中范围的边界
      const range = selection.getRangeAt(0);
      rect = range.getBoundingClientRect();
    }
    this.showWordDefinition(word, rect.x - (rect.width / 2), rect.y + rect.height);

    // // 如果选中的是单个元素（如图标）或折叠的选区，rect 可能为 0
    // // 此时尝试从选区中的节点获取位置
    // if (rect.width === 0 && rect.height === 0) {
    //   const container = range.commonAncestorContainer;
    //   // 确保容器是一个元素节点
    //   const element = container.nodeType === 3 ? container.parentElement : container;
    //   if (element) {
    //     const elementRect = element.getBoundingClientRect();
    //     createFloatingTip(message, data, elementRect);
    //     return;
    //   }
    // }

    // // 如果有有效的选中区域，则在其附近创建提示
    // if (rect) {
    //   createFloatingTip(message, data, rect);
    // }
  }

  // 创建一个浮动提示元素
  createFloatingTip(message, data, targetRect) {
    // 移除可能已存在的旧提示框，避免重复
    const existingTip = document.getElementById('wordbento-floating-tip');
    if (existingTip) {
      existingTip.remove();
    }

    // 创建提示框的 DOM 元素
    const tipElement = document.createElement('div');
    tipElement.id = 'wordbento-floating-tip';
    tipElement.innerHTML = `
      <strong>${message}</strong>
      ${data ? `<br><span>详细信息: ${JSON.stringify(data)}</span>` : ''}
    `;

    // 设置提示框的样式 (关键：使用绝对定位)
    Object.assign(tipElement.style, {
      position: 'absolute',
      background: '#4CAF50', // 绿色背景表示成功
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '14px',
      zIndex: '10000', // 确保在最上层
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      maxWidth: '300px',
      wordWrap: 'break-word',
      // 初始位置，下面会根据坐标调整
      left: '0',
      top: '0',
      display: 'block'
    });

    // 将提示框添加到页面
    document.body.appendChild(tipElement);

    // 计算提示框应该出现的位置
    const tipRect = tipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 理想位置：在选中区域的上方居中
    let desiredTop = targetRect.top + window.pageYOffset - tipRect.height - 5; // 5px 间距
    let desiredLeft = targetRect.left + window.pageXOffset + (targetRect.width / 2) - (tipRect.width / 2);

    // 边界检测，防止提示框超出视口[8](@ref)
    // 水平方向防止超出左右边界
    if (desiredLeft < 5) desiredLeft = 5;
    if (desiredLeft + tipRect.width > viewportWidth - 5) {
      desiredLeft = viewportWidth - tipRect.width - 5;
    }

    // 垂直方向：如果上方空间不够，就显示在下方
    if (desiredTop < window.pageYOffset) {
      desiredTop = targetRect.bottom + window.pageYOffset + 5;
    }

    // 应用计算好的位置
    tipElement.style.top = `${desiredTop}px`;
    tipElement.style.left = `${desiredLeft}px`;

    // 3 秒后自动淡出移除
    setTimeout(() => {
      tipElement.style.transition = 'opacity 0.5s ease';
      tipElement.style.opacity = '0';
      setTimeout(() => {
        if (tipElement.parentNode) {
          tipElement.parentNode.removeChild(tipElement);
        }
      }, 500);
    }, 3000);
  }

  // 备用的定位函数（当无法获取选中区域时使用）
  getFallbackPosition() {
    // 简单返回一个靠近视口中上部的矩形区域
    return {
      top: window.pageYOffset + 100,
      left: window.pageXOffset + 100,
      width: 0,
      height: 0,
      bottom: window.pageYOffset + 100,
      right: window.pageXOffset + 100
    };
  }

  showMessage(message, type = 'success') {
    console.log('显示消息:', message, type);
    
    // 移除已存在的消息
    const existingMessage = document.querySelector('.yt-translate-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // 创建临时提示消息
    const messageEl = document.createElement('div');
    messageEl.className = `yt-translate-message message-${type}`;
    messageEl.textContent = message;
    
    // 使用内联样式确保显示
    const bgColor = type === 'error' ? '#dc3545' : '#28a745';
    messageEl.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      padding: 12px 20px !important;
      border-radius: 6px !important;
      color: white !important;
      font-size: 14px !important;
      z-index: 99999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      background: ${bgColor} !important;
      font-weight: 500 !important;
      pointer-events: auto !important;
    `;
    
    document.body.appendChild(messageEl);
    // console.log('消息元素已添加到DOM:', messageEl);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
        console.log('消息已自动移除');
      }
    }, 3000);
  }

  addKeyboardListener() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+T 切换翻译面板显示
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        if (this.translationPanel) {
          const isVisible = this.translationPanel.style.display !== 'none';
          this.translationPanel.style.display = isVisible ? 'none' : 'block';
        }
      }
      
      // Esc 关闭单词弹窗
      if (e.key === 'Escape') {
        const popup = document.querySelector('.word-definition-popup');
        if (popup) {
          popup.remove();
        }
      }
    });
  }
}

// 初始化
new WordbentoTranslator();