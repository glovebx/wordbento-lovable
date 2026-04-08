
import { getLlmConfig } from '../../utils/security';
import { cleanAiJsonResponse, isLikelyJsonString } from '../../utils/languageParser';
import { posterStyle } from '../../utils/constants';
import { jsonrepair } from 'jsonrepair';

const enPrompt = `给你一个英文单词，返回下列json格式的数据:
{
  "英文单词": {
    "phonetic": "美式音标标注",
    "meaning": "简洁的中文含义，作为副标题",
    "definition": {
      "icon": "BookOpen",
      "en": "详细的英文词义解释，包含用法和语境。",
      "zh": "对应的中文词义解释。"
    },
    "examples": {
      "icon": "FileText",
      "en": ["英文例句 1","英文例句 2","英文例句 3"],
      "zh": ["中文翻译 1","中文翻译 2","中文翻译 3"]
    },
    "etymology": {
      "icon": "Atom",
      "en": "该单词的词源分析，包括来自哪一种语言。",
      "zh": "词源的中文说明。"
    },
    "affixes": {
      "icon": "Layers",
      "en": "词缀分析（如前缀、后缀、词根），以及相关词汇的构成。",
      "zh": "词缀分析的中文说明。"
    },
    "history": {
      "icon": "History",
      "en": "单词的发展历史、文化背景及其用法的变迁。",
      "zh": "发展历史与文化背景的中文说明。"
    },
    "forms": {
      "icon": "ArrowUpDown",
      "en": "单词变形，列出各种形态。",
      "zh": "单词各种形态的中文说明。"
    },
    "memory_aid": {
      "icon": "Lightbulb",
      "en": "记忆辅助方法，例如一个无厘头的小故事或将单词字母拆解成一句有趣的话。",
      "zh": "记忆辅助方法的中文版。"
    },
    "trending_story": {
      "icon": "Newspaper",
      "en": "一句来自影视剧的、包含该单词的经典台词（不超过80个单词），并注明出处。",
      "zh": "台词的中文翻译及场景说明。",
    }
  }
}
单词:`;

const jaPrompt = `给你一个日文单词，返回下列json格式的数据:
{
  "日文单词": {
    "phonetic": "假名标注",
    "meaning": "简洁中文含义",
    "definition": {
          "icon": "BookOpen",
          "en": "日文词义解释（含用法和语境）",
          "zh": "对应中文解释"
    },
    "examples": {
          "icon": "FileText",
          "en": ["日文例句1", "日文例句2", "日文例句3"],
          "zh": ["中文翻译1", "中文翻译2", "中文翻译3"]
    },
    "etymology": {
          "icon": "Atom",
          "en": "词源分析（如汉语来源、和语演变、外来语适应）",
          "zh": "中文词源说明"
    },
    "affixes": {
          "icon": "Layers",
          "en": "词缀分析（汉字构成、接辞功能、复合词结构）",
          "zh": "中文词缀解释"
    },
    "history": {
          "icon": "History",
          "en": "历史演变与文化背景（如时代变迁、社会影响）",
          "zh": "中文历史与文化说明"
    },
    "forms": {
          "icon": "ArrowUpDown",
          "en": "变形列表（动词活用形、形容词变化、礼貌体等）",
          "zh": "中文变形说明"
    },
    "memory_aid": {
          "icon": "Lightbulb",
          "en": "记忆辅助内容，故事联想或假名拆解（日文版）",
          "zh": "记忆辅助内容（中文版）"
    },
    "trending_story": {
          "icon": "Newspaper",
          "en": "影视剧台词（日文原句，来源注明）",
          "zh": "台词中文翻译及剧情上下文"
    }
  }
}
单词:`;

// const posterStyle = [
// {
//     "style": "vintage travel poster",
//     "desc": "复古旅行海报"
//   },
//   {
//     "style": "cyberpunk graphic design",
//     "desc": "赛博朋克风格"
//   },
//   {
//     "style": "watercolor and ink painting",
//     "desc": "水墨水彩风格"
//   },
//   {
//     "style": "psychedelic art",
//     "desc": "迷幻艺术"
//   },
//   // {
//   //   "style": "Ink drawing and watercolor wash, loose lines, soft color bleeds",
//   //   "desc": "墨水笔触与水彩渲染，线条洒脱，颜色柔和晕染 - 适合：诗意、自然、情感细腻的单词"
//   // },
//   {
//     "style": "Woodcut print style, bold lines, high contrast, textured paper",
//     "desc": "木刻版画风格，线条粗犷，高对比度，带纹理纸张 - 适合：有力、古老、有警示或寓言意味的单词"
//   },
//   // {
//   //   "style": "Soft pastel drawing, chalky texture, dreamy and muted colors",
//   //   "desc": "柔和粉彩画，粉质感纹理，梦幻柔和的色彩 - 适合：温柔、梦幻、童年回忆相关的单词"
//   // },
//   // {
//   //   "style": "Ukiyo-e style, flat areas of color, strong outlines, classic Japanese art",
//   //   "desc": "浮世绘风格，平涂色彩，强烈的轮廓线，经典日本艺术 - 适合：日文单词，或与东方文化、自然景观相关的词汇"
//   // },
//   // {
//   //   "style": "Minimalist, monochromatic, uses a single color with plenty of negative space",
//   //   "desc": "极简主义，单色调，大量留白 - 适合：概念抽象、哲学思辨的单词"
//   // },
//   // {
//   //   "style": "Abstract liquid art, fluid shapes, ink in water, vibrant color merges",
//   //   "desc": "抽象液态艺术，流动形态，水墨交融，色彩 vibrant 融合 - 适合：表达情感、变化、潜意识或科学概念的单词"
//   // },
//   {
//     "style": "Neo-pop art, bold outlines, saturated colors, halftone patterns",
//     "desc": "新波普艺术，粗轮廓线，高饱和色彩，网点图案 - 适合：流行、时尚、富有活力甚至带点反叛的单词"
//   },
//   // {
//   //   "style": "Bauhaus design, geometric shapes, primary colors, clean typography",
//   //   "desc": "包豪斯设计，几何图形，三原色，干净的版式 - 适合：与设计、结构、理性相关的单词"
//   // },
//   {
//     "style": "Art Deco, geometric patterns, metallic accents, elegant and sleek",
//     "desc": "装饰风艺术，几何图案，金属质感，优雅流畅 - 适合：奢华、精致、充满“爵士时代”风情的单词"
//   },
//   {
//     "style": "Mid-century modern illustration, organic shapes, earthy tones",
//     "desc": "中世纪现代风格插画，有机形态，大地色系 - 适合：家居、温馨、复古未来主义相关的单词"
//   },
//   {
//     "style": "Swiss Style poster, asymmetric layout, clean typography, photo collage",
//     "desc": "瑞士平面设计风格，不对称布局，干净字体，照片拼贴 - 适合：需要强版式设计感、信息清晰的单词"
//   },
//   {
//     "style": "Gothic style, intricate blackwork, occult symbolism, dramatic lighting",
//     "desc": "哥特风格，复杂的黑色图案，神秘符号，戏剧性光线 - 适合：黑暗、神秘、古典、与神话或魔法相关的单词"
//   },
//   // {
//   //   "style": "Bioluminescent, deep sea creatures, glowing in the dark, ethereal",
//   //   "desc": "生物发光，深海生物，暗处发光，空灵 - 适合：神秘、未知、美丽而诡异的事物"
//   // },
//   {
//     "style": "Glitch art, digital distortion, RGB shift, corrupted data aesthetics",
//     "desc": "故障艺术，数字失真，RGB 色彩分离，数据错误美学 - 适合：表达混乱、错误、数字时代或解构意义的单词"
//   },
//   {
//     "style": "Synthwave, retro-futuristic, grid lines, neon colors, digital sunset",
//     "desc": "合成波普，复古未来主义，网格线，霓虹色彩，数字日落 - 适合：怀旧、电子乐、80年代流行文化相关的单词"
//   },
//   // {
//   //   "style": "Cybernetic organic, blending flesh and machinery, intricate details",
//   //   "desc": "赛博格有机体，血肉与机械融合，复杂细节 - 适合：探讨人性、科技、进化等深刻主题的单词"
//   // },
//   {
//     "style": "Brutalist typography, raw concrete texture, bold geometric forms",
//     "desc": "粗野主义版式，原始混凝土质感，大胆几何形态 - 适合：力量感、工业、反装饰的单词"
//   },
//   {
//     "style": "Etching and engraving style, fine cross-hatching, classical detail",
//     "desc": "蚀刻版画风格，精细交叉排线，古典细节 - 适合：精致、古典、历史感强的单词"
//   },
//   {
//     "style": "Surrealist collage, dreamlike juxtaposition, vintage imagery",
//     "desc": "超现实主义拼贴，梦幻般的并置，复古图像 - 适合：潜意识、梦境、非逻辑组合的单词"
//   },
//   // {
//   //   "style": "Kinetic art, optical illusion, dynamic movement, moiré patterns",
//   //   "desc": "动态艺术，视错觉，动态运动，莫尔条纹 - 适合：运动、能量、视觉变幻的单词"
//   // },
//   {
//     "style": "Art Nouveau, flowing organic lines, floral motifs, elegant curves",
//     "desc": "新艺术运动，流动有机线条，花卉图案，优雅曲线 - 适合：自然、女性化、装饰性强的单词"
//   },
//   {
//     "style": "Pointillism, small distinct dots, optical color mixing",
//     "desc": "点彩派，小而独特的点，光学色彩混合 - 适合：细腻、光影、需要视觉混合的单词"
//   },
//   {
//     "style": "Chiaroscuro, strong contrast between light and dark, dramatic",
//     "desc": "明暗对照法，强烈光影对比，戏剧性 - 适合：冲突、张力、宗教或哲学主题的单词"
//   },
//   {
//     "style": "Dadaist, nonsensical, provocative, typographic experimentation",
//     "desc": "达达主义，荒谬不经，挑衅性，字体实验 - 适合：反传统、荒诞、具有挑战性的单词"
//   },
//   {
//     "style": "Futurism, dynamic motion, speed lines, technological enthusiasm",
//     "desc": "未来主义，动态运动，速度线，技术热情 - 适合：速度、进步、机械感的单词"
//   },
//   {
//     "style": "Pre-Raphaelite, detailed nature, vibrant colors, medieval revival",
//     "desc": "前拉斐尔派，细腻的自然描绘，鲜艳色彩，中世纪复兴 - 适合：浪漫、自然、中世纪主题的单词"
//   },
//   {
//     "style": "Constructivism, angular forms, red/black/white color scheme, industrial",
//     "desc": "构成主义，棱角分明的形式，红/黑/白配色，工业感 - 适合：结构、革命、工业美学的单词"
//   },
//   {
//     "style": "Outsider Art, naive, childlike, untrained aesthetic",
//     "desc": "局外人艺术，天真，童稚，未经训练的美学 - 适合：原始、直觉、反学院派的单词"
//   },
//   {
//     "style": "Superflat, manga/anime influenced, bold outlines, pop culture",
//     "desc": "超扁平风格，受漫画/动画影响，粗轮廓线，流行文化 - 适合：日本流行文化、二次元、平面化的单词"
//   },
//   {
//     "style": "Vaporwave, glitchy, 80s/90s nostalgia, digital marble statues",
//     "desc": "蒸汽波，故障感，80/90年代怀旧，数字大理石雕像 - 适合：互联网怀旧、消费主义批判的单词"
//   },
//   // {
//   //   "style": "Light painting, long exposure, trails of light in darkness",
//   //   "desc": "光绘摄影，长时间曝光，黑暗中的光迹 - 适合：时间、轨迹、瞬间与永恒主题的单词"
//   // },
//   {
//     "style": "Papercut, layered paper, intricate silhouettes, shadow play",
//     "desc": "剪纸艺术，分层纸张，复杂剪影，光影游戏 - 适合：精致、传统、民间艺术的单词"
//   },
//   // {
//   //   "style": "Holographic, iridescent, shifting colors, futuristic sheen",
//   //   "desc": "全息风格，虹彩，变换颜色，未来感光泽 - 适合：未来、科技、虚幻美丽的单词"
//   // },
//   {
//     "style": "Arte Povera, humble materials, raw and unfinished aesthetic",
//     "desc": "贫穷艺术，朴素材料，原始未完成美学 - 适合：物质性、简朴、概念艺术的单词"
//   },
//   {
//     "style": "Folk art, traditional patterns, handcrafted feel, cultural motifs",
//     "desc": "民间艺术，传统图案，手工艺感，文化元素 - 适合：民族、传统、手工艺相关的单词"
//   },
//   {
//     "style": "De Stijl, strict geometric abstraction, primary colors, grid-based",
//     "desc": "风格派，严格的几何抽象，三原色，基于网格 - 适合：纯粹抽象、结构、基本元素的单词"
//   }  
// ];

export const generateBentoByAi = async (c, userId, word, isJapanese, hasFreeQuota) => {
  let aiResponse = false;
  const platforms = ['openai', 'gemini', 'deepseek'];
  for (const platform of platforms) {
    const llm = await getLlmConfig(c, platform, userId, hasFreeQuota);
    if (llm[1]) {
      aiResponse = await generateBentoByPlatformAi(c, llm, word, isJapanese);
      if (aiResponse && aiResponse[word]) {
        return aiResponse;
      }
    }
  }
  return null;
};

const generateBentoByPlatformAi = async (c, llm, word, isJapanese) => {
  const prompt = (isJapanese ? jaPrompt : enPrompt) + word;
  const jsonData = {
    model: llm[3],
    messages: [
      { role: 'system', content: 'You are a professional proficient in multiple languages, including Chinese, English, Japanese, and more.' },
      { role: 'user', content: prompt },
    ],
  };

  try {
    const response = await fetch(llm[1], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llm[2]}` },
      body: JSON.stringify(jsonData),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) return null;
    return repairAiResponseToJson(data.choices[0].message.content);
  } catch (error) {
    console.error(`Error calling ${llm[0]} AI API:`, error);
    return null;
  }
};

export const generateImageByAi = async (c, userId, word, phonetic, example, language, hasFreeQuota) => {
    let imageUrls = [];
    const platforms = ['dreamina', 'jimeng', 'seedream'];
    for (const platform of platforms) {
        const llm = await getLlmConfig(c, platform, userId, hasFreeQuota);
        if (llm[1]) {
            switch (platform) {
                case 'dreamina':
                    imageUrls = await generateImageByDreaminaAi(c, llm, word, phonetic, example, language);
                    break;
                case 'jimeng':
                    imageUrls = await generateImageByJiMengAi(c, llm, word, phonetic, example, language);
                    break;
                case 'seedream':
                    imageUrls = await generateImageBySeeDreamAi(c, llm, word, phonetic, example, language);
                    break;
            }
            if (imageUrls && imageUrls.length > 0) {
                return imageUrls;
            }
        }
    }
    return null;
};

const generateImageByDreaminaAi = async (c, llm, word, phonetic, example, language) => {
    const style = posterStyle[Math.floor(Math.random() * posterStyle.length)].style;
    const prompt = example ? generatePosterPromptWithExample(word, language, phonetic, example, style) : generatePosterPromptWithoutExample(word, language, phonetic, style);
    const jsonData = { model: llm[3] || '', prompt, ratio: "9:16", resolution: "1k" };
    return callImageApi(llm, jsonData);
};

const generateImageByJiMengAi = async (c, llm, word, phonetic, example, language) => {
    const style = posterStyle[Math.floor(Math.random() * posterStyle.length)].style;
    const prompt = example ? generatePosterPromptWithExample(word, language, phonetic, example, style) : generatePosterPromptWithoutExample(word, language, phonetic, style);
    const jsonData = { model: llm[3], stream: false, resolution: "1k", ratio: "9:16", messages: [{ role: 'user', content: prompt }] };
    const response = await callImageApi(llm, jsonData, true);
    return response ? extractHttpLinks(response) : null;
};

const generateImageBySeeDreamAi = async (c, llm, word, phonetic, example, language) => {
    const style = posterStyle[Math.floor(Math.random() * posterStyle.length)].style;
    const prompt = example ? generatePosterPromptWithExample(word, language, phonetic, example, style) : generatePosterPromptWithoutExample(word, language, phonetic, style);
    const jsonData = { model: llm[3], prompt, size: '1440x2560', response_format: "url", sequential_image_generation: "disabled", stream: false, watermark: false };
    const response = await callImageApi(llm, jsonData, true);
    return response ? [response.url] : null;
};

const callImageApi = async (llm, jsonData, isTextResponse = false) => {
    try {
        const response = await fetch(llm[1], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llm[2]}` },
            body: JSON.stringify(jsonData),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (isTextResponse) {
            if (!data.choices || data.choices.length === 0 || !data.choices[0].message) return null;
            return data.choices[0].message.content;
        } else {
            if (!data.data || data.data.length === 0) return null;
            return data.data.map(d => d.url);
        }
    } catch (error) {
        console.error(`Error calling ${llm[0]} Image AI API:`, error);
        return null;
    }
};

export const repairAiResponseToJson = (messageContent) => {
    const jsonStr = cleanAiJsonResponse(messageContent);
    if (!jsonStr) return null;
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        try {
            return JSON.parse(jsonrepair(jsonStr));
        } catch (e2) {
            return null;
        }
    }
};

const generatePosterPromptWithExample = (word, language, pronunciation, exampleSentence, style) => {
    return `Conceptual poster for ${language} word "${word}". Main title: "${word}" (large, bold, artistic, top). Subtitle: "${pronunciation}" (smaller, elegant, below title). Background scene must VISUALLY DEPICT the situation, action, or context of the sentence: "${exampleSentence}". Integrate all text seamlessly. Crucial: sentence must be highly legible. Style: ${style}. Additionally, the full sentence must appear as text on the poster.`;
};

const generatePosterPromptWithoutExample = (word, language, pronunciation, style) => {
    return `Conceptual poster for ${language} word "${word}": visually define its essence. Title "${word}" large/bold as focal point; pronunciation "${pronunciation}" below elegantly. Imagery conveys concept intuitively to non-speakers via evocative metaphor. Style: ${style}. Additionally, the full sentence must appear as text on the poster. `;
};

function extractHttpLinks(text) {
    const urlRegex = /(https?:\/\/[^\s"]+)/g;
    return text.match(urlRegex) || [];
}
