// import puppeteer from 'puppeteer';
import puppeteer from "@cloudflare/puppeteer";
import { parseLanguageCode } from './utils/languageParser.js';

export default class DownSub {
  constructor() {
    this.baseUrl = 'https://downsub.com';
    this.apiPattern = /https:\/\/get-info\.downsub\.com\/\?.*/;
  }

  async scrapeCaptions(c, youtubeUrl) {
    let browser;
    try {
        // const options = {};
        // const stats = await PCR(options);

        // const browser = await stats.puppeteer.launch({
        //     headless: false,
        //     defaultViewport: null,
        //     executablePath: stats.executablePath, 
        //     ignoreDefaultArgs: ["--disable-sync"],
        //     args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-extensions"],
        // }).catch(function(error) {
        //     console.log(error);
        // });
    //   // 启动Puppeteer（默认使用Chromium）
    //   browser = await puppeteer.launch({ 
    //     headless: false,
    //     args: ['--no-sandbox', '--disable-setuid-sandbox']
    //   });
      const browser = await puppeteer.launch(c.env.MYBROWSER);
      const page = await browser.newPage();
      
      // 启用请求拦截
      await page.setRequestInterception(true);
      
      // 存储捕获的API端点
      let captionEndpoint;
      
      // 设置请求拦截处理
      page.on('request', async (request) => {
        // 拦截广告相关请求
        if (request.url().includes('ads')) {
          return request.abort();
        }
        
        // 捕获字幕API请求
        if (this.apiPattern.test(request.url())) {
          captionEndpoint = request.url();
          return request.abort();
        }
        
        request.continue();
      });

      // 导航到目标页面
      await page.goto(`${this.baseUrl}/?url=${encodeURIComponent(youtubeUrl)}`, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // 验证是否捕获到端点
      if (!captionEndpoint) {
        throw new Error('Failed to capture caption API endpoint');
      }

      // 获取字幕数据（后续逻辑保持不变）
      const captionData = await this.fetchCaptionData(captionEndpoint);
      return this.formatCaptionData(captionData);

    } catch (error) {
      // 错误处理增强
      const errorMap = {
        TimeoutError: '页面加载超时',
        ERR_CONNECTION_REFUSED: '连接被拒绝'
      };
      
      throw new Error(errorMap[error.name] || `爬取失败: ${error.message}`);
      
    } finally {
      if (browser) await browser.close();
    }
  }

  async fetchCaptionData(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json();
  }

  formatCaptionData(data) {
    if (data.sourceName !== 'Youtube') {
      throw new Error('Unsupported video source');
    }

    const baseUrls = {
      raw: `${data.urlSubtitle}?type=raw&title=`,
      txt: `${data.urlSubtitle}?type=txt&title=`,
      srt: data.urlSubtitle
    };

    return {
      metadata: {
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration
      },
      subtitles: this.processLanguages(data.subtitles, baseUrls),
      translations: this.processLanguages(data.subtitlesAutoTrans, baseUrls)
    };
  }

  processLanguages(subs, baseUrls) {
    return subs.map(sub => ({
      language: parseLanguageCode(sub.name),
      urls: {
        raw: `${baseUrls.raw}${encodeURIComponent(sub.url)}`,
        txt: `${baseUrls.txt}${encodeURIComponent(sub.url)}`,
        srt: `${baseUrls.srt}?url=${encodeURIComponent(sub.url)}`
      }
    }));
  }
}