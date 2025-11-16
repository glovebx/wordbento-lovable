// AI单词提取和翻译内容脚本
class WordbentoTranslator {

  constructor() {
    this.isActive = false;
    this.translationPanel = null;
    this.currentSubtitles = [];
    this.observer = null;
    this.init();
  }

  init() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    console.log('Wordbento单词AI助手插件已启动');
    
    // 检查是否在YouTube视频页面
    if (this.isYouTubeVideoPage()) {
      // 创建翻译面板
      this.createTranslationPanel();
      
      // 开始监听字幕变化
      this.startSubtitleObserver();
      
      // 添加单词点击事件监听
      this.addWordClickListener();
      
      // 监听键盘快捷键
      this.addKeyboardListener();
    }
    // 在 contentScript.js 中
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'addedToWordbento') {
        // 在页面上显示消息的逻辑
        console.log('收到消息:', request.message);
        // this.showMessage(request.message, 'success');
        this.showFloatingWordDefinition(request.word);
        // // 可以调用 sendResponse() 来回复背景脚本
        // sendResponse({ status: 'success' });
      }
    });    
  }

  isYouTubeVideoPage() {
    return window.location.pathname === '/watch' && window.location.search.includes('v=');
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
    // 监听YouTube字幕容器
    // const subtitleSelector = '.caption-window, .ytp-caption-window-container, [class*="caption"]';
    
    // 添加防抖优化
    let subtitleTimeout;    
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
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
    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // 立即尝试提取一次字幕
    setTimeout(() => this.extractSubtitles(), 2000);
  }

  extractSubtitles() {
    // // 尝试多种YouTube字幕选择器
    // const selectors = [
    //   '.caption-window .captions-text',
    //   '.ytp-caption-window-container .captions-text',
    //   '.caption-visual-line',
    //   '[class*="caption"] span',
    //   '.ytp-caption-segment'
    // ];
    
    let subtitleText = '';
    
    // for (const selector of selectors) {
    //   const elements = document.querySelectorAll(selector);
    //   if (elements.length > 0) {
    //     subtitleText = Array.from(elements)
    //       .map(el => el.textContent.trim())
    //       .filter(text => text.length > 0)
    //       .join(' ');
    //     break;
    //   }
    // }

    // 方法3：尝试定位行级容器而非单词级元素
    // 优化后的选择器，优先抓取行级容器
    const lineSelectors = [
      '[id*="caption-line"]', // 特定ID模式
      '.caption-visual-line', // 视觉行
      '.ytp-caption-segment', // 字幕片段
      '[data-line]' // 通用数据属性
    ];

    for (const selector of lineSelectors) {
      const lines = document.querySelectorAll(selector);
      if (lines.length > 0) {
        subtitleText = Array.from(lines)
          .map(line => {
            // 提取行内所有文本内容
            return line.textContent.replace(/\s+/g, ' ').trim();
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
    console.log('更新字幕显示:', text);
    const originalTextEl = document.getElementById('original-text');
    if (originalTextEl) {
      const highlightedText = this.highlightWords(text);
      // console.log('高亮后的文本:', highlightedText);
      originalTextEl.innerHTML = highlightedText;
    }
  }

  highlightWords(text) {
    // 将英文单词包装在span中，便于点击选择
    return text.replace(/\b[a-zA-Z]+\b/g, '<span class="clickable-word">$&</span>');
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

  showWordDefinition(word, x, y) {
    // 移除已存在的定义弹窗
    const existingPopup = document.querySelector('.word-definition-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // 创建单词定义弹窗
    const popup = document.createElement('div');
    popup.className = 'word-definition-popup';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    
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
      }
    } else {
      // 获取选中范围的边界
      const range = selection.getRangeAt(0);
      rect = range.getBoundingClientRect();
    }
    this.showWordDefinition(word, rect.x, rect.y);

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