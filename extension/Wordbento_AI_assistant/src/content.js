// AI单词提取和翻译内容脚本
class WordbentoTranslator {

  constructor() {
    this.isActive = false;
    this.translationPanel = null;
    this.currentSubtitles = [];
    this.subtitleObserver = null; // 重命名，区分 URL/DOM 观察者
    // this.urlObserver = null;      // 新增 URL 变化观察者
    this.showYtpCaptionContainer = true;
    this.currentSubtitleText = '';
    // this.lastUrl = window.location.href; // 记录当前 URL
    this.isInitialized = false; // 跟踪是否已完成核心初始化
    this.init();
  }

  init() {        
    // // 监听 URL 变化，这是解决 SPA 问题的关键
    // this.startUrlObserver();
    console.log('Wordbento单词AI助手插件初始化中...');

    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }

    // 在 contentScript.js 中
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'addToWordbento') {
        // 在页面上显示消息的逻辑
        console.log('收到消息:', request.message);
        // this.showMessage(request.message, 'success');
        this.showFloatingWordDefinition(request.word);
        // // 可以调用 sendResponse() 来回复背景脚本
        // sendResponse({ status: 'success' });
      }
    });      
  }

  start() {
    console.log('Wordbento单词AI助手插件已启动');
    
    // 检查是否在YouTube视频页面
    if (this.isYouTubeVideoPage()) {
      // 确保在 SPA 导航时只初始化一次面板和监听器
      if (!this.isInitialized) {
        // 创建翻译面板
        this.createTranslationPanel();
        
        // 开始监听字幕变化
        this.startSubtitleObserver();
        
        // 添加单词点击事件监听
        this.addWordClickListener();
        
        // 监听键盘快捷键
        this.addKeyboardListener();

        // 调用方式
        const that = this;
        this.getSettings()
          .then(settings => {
            console.log('获取到的设置:', settings);
            // 这里可以继续链式调用
            that.showYtpCaptionContainer = settings.showYtpCaptionContainer;
          })
          .catch(error => {
            console.error('获取设置失败:', error);
          });

        this.isInitialized = true; // 标记核心初始化完成  
      } else {
        // 如果已初始化，但URL匹配，确保面板是可见的
        if (this.translationPanel) {
            this.translationPanel.style.display = 'block';
        }
        // 在 SPA 导航到新的视频时，我们需要重新清理字幕历史
        this.currentSubtitles = []; 
        // 重新尝试提取一次字幕
        setTimeout(() => this.extractSubtitles(), 500);        
      }
    } else {
        // 如果不在视频页面，隐藏面板并停止字幕监听
        if (this.translationPanel) {
            this.translationPanel.style.display = 'none';
        }
        if (this.subtitleObserver) {
            this.subtitleObserver.disconnect();
            this.subtitleObserver = null;
        }
        this.isInitialized = false; // 重置初始化状态
    }  
  }

  // // ==========================================================
  // // 关键改动：监听 URL 变化以处理 SPA 导航
  // // ==========================================================
  // startUrlObserver() {
  //   console.log('Wordbento: 启动 URL 变化观察者');
    
  //   // 监听 URL 变化
  //   this.urlObserver = new MutationObserver(() => {
  //       const currentUrl = window.location.href;
  //       if (currentUrl !== this.lastUrl) {
  //           console.log('Wordbento: 检测到 URL 变化:', this.lastUrl, '->', currentUrl);
  //           this.lastUrl = currentUrl;
            
  //           // 重新运行 start 方法，它将根据新 URL 决定是初始化还是清理
  //           this.start();
  //       }
  //   });

  //   // 观察整个文档的 DOM 变化，因为 URL 变化通常伴随着 DOM 结构的大幅改变
  //   // 或者您也可以只观察 body 或 title 元素
  //   this.urlObserver.observe(document.documentElement, { 
  //     childList: true, 
  //     subtree: true,
  //   });
  // }  

  isYouTubeVideoPage() {
    // return window.location.pathname === '/watch' && window.location.search.includes('v=');
    return window.location.href.includes('/watch?v=');
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
    console.log('更新字幕显示:', text);
    const originalTextEl = document.getElementById('original-text');
    if (originalTextEl) {
      const highlightedText = this.highlightWords(text);
      // // console.log('高亮后的文本:', highlightedText);
      // originalTextEl.innerHTML = highlightedText;
      // 4. 将新内容添加到历史记录
      this.addToCurrentSubtitles({text: text, html: highlightedText, raw: text});  
      // 显示所有
      // 将3条记录用分隔符连接显示
      const combinedDisplay = this.currentSubtitles
        .map((d) => d.html)
        .join('<br><hr><br>'); // 用换行分隔每条记录
      
      originalTextEl.innerHTML = combinedDisplay;
    }
  }

  highlightWords(text) {
    // 将英文单词包装在span中，便于点击选择
    return text.replace(/\b[a-zA-Z]+\b/g, '<span class="clickable-word">$&</span>');
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
    // 确保数组存在
    if (!this.currentSubtitles) {
      this.currentSubtitles = [];
    }

    if (this.currentSubtitles.length == 0) {
      this.currentSubtitles.push(textAndHtml);
      return;
    }
    
    const text = textAndHtml.text;

    const lastText = this.currentSubtitles[this.currentSubtitles.length - 1].raw;

    console.log('lastText vs text >>>', lastText, '<<< >>>', text)
    if (lastText && text.indexOf(lastText) >= 0) {
      // console.log('lastText vs text >>>', '完全覆盖')
      // 上一条被本条完全包含，则被替代
      this.currentSubtitles[this.currentSubtitles.length - 1] = textAndHtml;
      // 这里替换造成上一条的tailText被覆盖，因此需要重新计算
      if (this.currentSubtitles[this.currentSubtitles.length - 1].text !== lastText) {
        if (this.currentSubtitles.length > 2) {
          console.log('从新计算>>>');
          const tail = this.getTailText(this.currentSubtitles[this.currentSubtitles.length - 2].raw, text);
          if (tail.text && tail.text.trim().length > 0) {
            this.currentSubtitles[this.currentSubtitles.length - 1] = {text: tail.text, html: this.highlightWords(tail.text), raw: text}
          }
        }
      }
      // 返回
      return;
    } 
        
    const tail = this.getTailText(lastText, text);
    console.log('tail >>>', tail);        
    if (tail.text && tail.text.trim().length > 0) {
      // if (tail.isNew) {
        this.currentSubtitles.push({text: tail.text, html: this.highlightWords(tail.text), raw: text});
      // } else {
      //   // 替换
      //   this.currentSubtitles[this.currentSubtitles.length - 1] = {text: lastText + tail.text, html: this.highlightWords(lastText + tail.text), raw: text}
      // }
    }
    // 保持数组长度不超过3
    if (this.currentSubtitles.length > 5) {
      // 移除最旧的一条记录（数组开头的元素）
      this.currentSubtitles.shift();
    }
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