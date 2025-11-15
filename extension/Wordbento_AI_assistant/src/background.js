// 后台服务脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log('Wordbento单词AI助手插件已安装');
  
  // 初始化默认设置
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      const defaultSettings = {
        // translationEngine: 'deepl',
        wordbentoApiKey: '',
        showPostcard: true,
        showPhonetic: true,
        theme: 'dark',
        panelPosition: 'right',
        shortcuts: {
          togglePanel: 'Ctrl+T',
          addToWordbook: 'Ctrl+D'
        }
      };
      
      chrome.storage.local.set({ settings: defaultSettings });
    }
  });
  
  // // 创建右键菜单
  // chrome.contextMenus.create({
  //   id: 'translateSelection',
  //   title: '翻译选中文本',
  //   contexts: ['selection']
  // });
  
  chrome.contextMenus.create({
    id: 'addToWordbook',
    title: '添加到Wordbento',
    contexts: ['selection']
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {      
    case 'getWordDefinition':
      fetchWordDefinition(request.word)
        .then(result => sendResponse({ success: true, definition: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'saveToWordbook':
      saveWordToWordbento(request.word)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});


// 追加到wordbento
async function saveWordToWordbento(text) {
  try {
    // 获取API密钥
    const settings = await getSettings();
    const apiKey = settings.wordbentoApiKey;
    
    if (!apiKey || apiKey.trim() === '') {
      console.log('未配置Wordbento API密钥');
      throw new Error('Wordbento API密钥未配置');
    }
    
    // DeepL免费API接口
    const response = await fetch('http://192.168.3.58:8787/api/word/search', {
      method: 'POST',
      headers: {
        'Authorization': `Wordbento-Auth-Key ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'slug': text
      })
    });

    if (!response.ok) {
      console.error('Wordbento API请求失败，状态码:', response.status);
      throw new Error('Wordbento API请求失败，请检查设置是否正确');
    }

    const data = await response.json();

    console.log(data)
    
    if (data.content) {
      console.log('Wordbento追加单词成功');
      return {...data, word: text};
    }
    
    throw new Error('Wordbento响应格式错误');
  } catch (error) {
    console.error('Wordbento追加单词失败:', error);
    // return {
    //   word: text,
    //   phonetic: '',
    //   meanings: 'Wordbento服务暂时不可用'
    // };
    throw error;
  }
}

// 获取单词定义
async function fetchWordDefinition(word) {
  try {
    const data = await saveWordToWordbento(word);
    
    return data;
    
  } catch (error) {
    console.error('获取单词定义失败:', error);
    // 返回备用定义
    return {
      word: word,
      phonetic: '',
      meanings: ''
    };
  }
}

// 获取设置
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || {});
    });
  });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // YouTube视频页面加载完成，可以在这里做一些初始化工作
    console.log('YouTube视频页面已加载:', tab.url);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToWordbook' && info.selectionText) {
    // 添加选中文本到生词本
    const word = info.selectionText.trim();
    saveWordToWordbento(word)
    .then(() => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showMessage',
        message: `"${word}" 已添加到Wordbento`
      });
    })
    .catch(error => {
      console.error('添加到Wordbento失败:', error);
    });
  }
});