
import { WordData } from '@/components/WordGrid';

// Mock database of words
export const wordDatabase: Record<string, WordData> = {
  "hurl": {
    phonetic: "/hɜːrl/",
    meaning: "投掷、猛力抛出",
    definition: {
      en: "To throw or fling with great force, often in an aggressive manner. Can also refer to forcefully expressing harsh words or insults.",
      zh: "用很大力气猛烈地抛、掷、扔；也可指激烈地表达尖锐的批评或侮辱性言论。"
    },
    examples: {
      en: [
        "The pitcher can hurl the baseball at over 95 miles per hour.",
        "Protesters hurled stones at the police barricade.",
        "The critic hurled accusations of plagiarism at the author."
      ],
      zh: [
        "这位投手能以超过95英里每小时的速度投掷棒球。",
        "抗议者向警方设置的路障投掷石块。",
        "评论家对作者提出了抄袭的指控。"
      ]
    },
    etymology: {
      en: "The word 'hurl' comes from Middle English 'hurlen', which means 'to rush, dash against.' It's likely related to Old Norse 'hurra' meaning 'to whir or spin' and possibly connected to Low German 'hurreln' meaning 'to throw or hurl'.",
      zh: "单词'hurl'来源于中古英语'hurlen'，意为'冲、猛撞'。它可能与古挪威语'hurra'(意为'呼啸或旋转')相关，也可能与低地德语'hurreln'(意为'抛或掷')有联系。"
    },
    affixes: {
      en: "The word 'hurl' is a base word without prefixes or suffixes. Related forms include: hurler (noun, person who hurls), hurling (gerund/present participle), hurled (past tense).",
      zh: "'hurl'是一个没有前缀或后缀的基本词。相关形式包括：hurler（名词，投掷者），hurling（动名词/现在分词），hurled（过去式）。"
    },
    history: {
      en: "The concept of 'hurling' has been fundamental to human development, from primitive hunting techniques to warfare. In sports, hurling is also the name of an ancient Irish game dating back over 3,000 years, considered one of the world's oldest field games, where players use sticks (hurleys) to hit a small ball.",
      zh: "'投掷'的概念对人类发展至关重要，从原始狩猎技术到战争都离不开它。在体育领域，'hurling'也是一种有着3000多年历史的爱尔兰古老运动的名称，被认为是世界上最古老的场地运动之一，运动员使用木棍（hurleys）击打小球。"
    },
    forms: {
      en: "Present: hurl, hurls\nPast: hurled\nPast participle: hurled\nPresent participle: hurling\nNouns: hurler (person), hurl (the act)",
      zh: "现在式：hurl, hurls\n过去式：hurled\n过去分词：hurled\n现在分词：hurling\n名词：hurler（投掷者），hurl（投掷行为）"
    },
    memoryAid: {
      en: "Think of 'hurl' as 'H-U-Really Launch' something. The 'H' stands for 'high' and 'U' for 'up' - when you hurl something, you're really launching it high up with force!",
      zh: "将'hurl'想象成'H-U-Really Launch'（真正发射）。'H'代表'high'（高），'U'代表'up'（向上）——当你hurl某物时，你是真的在用力将它高高发射出去！"
    },
    trendingStory: {
      en: "In recent Olympic discussions, analysts noted how social media has transformed the way we perceive sports like javelin throwing. \"Athletes no longer just hurl spears for distance,\" commented sports psychologist Dr. Mei Zhang. \"They hurl themselves into viral fame with every throw.\" This phenomenon highlights how traditional feats of strength now combine with digital presence, as Olympic hopefuls hurl not just physical objects but their personal brands into the global spotlight.",
      zh: "在最近的奥运会讨论中，分析人士注意到社交媒体已经改变了我们看待标枪等运动的方式。体育心理学家梅·张博士评论道：\"运动员不再仅仅为了距离而投掷标枪，每一次投掷都将自己推向病毒式的网络名声。\"这种现象突显了传统力量表演如何与数字存在相结合，奥运会希望者不仅投掷实物，还将个人品牌推向全球聚光灯下。"
    }
  },
  "abacus": {
    phonetic: "/ˈæbəkəs/",
    meaning: "算盘",
    definition: {
      en: "A calculating device consisting of a frame with rods on which beads or counters can slide, used for performing arithmetic calculations.",
      zh: "一种计算设备，由带有可滑动珠子或计数器的杆的框架组成，用于执行算术计算。"
    },
    examples: {
      en: [
        "Children in some countries still learn basic math using an abacus.",
        "The merchant quickly calculated the total on his abacus.",
        "The ancient abacus was one of the first calculating tools humans developed."
      ],
      zh: [
        "一些国家的儿童仍然使用算盘学习基础数学。",
        "商人迅速用算盘计算了总数。",
        "古代算盘是人类发明的最早的计算工具之一。"
      ]
    },
    etymology: {
      en: "The word 'abacus' comes from Latin 'abacus', which was derived from Greek 'abax' meaning 'counting board'. The Greek term may have originated from a Semitic word 'abq' meaning 'dust' or 'sand', referring to early counting boards where numbers were traced in sand.",
      zh: "'abacus'一词来源于拉丁语'abacus'，源于希腊语'abax'，意为'计数板'。希腊语可能起源于闪族语'abq'，意为'灰尘'或'沙子'，指的是早期在沙中绘制数字的计数板。"
    },
    affixes: {
      en: "The word 'abacus' is a base word without prefixes or suffixes. The plural form is 'abaci' (formal) or 'abacuses' (common usage).",
      zh: "'abacus'是一个没有前缀或后缀的基本词。复数形式为'abaci'（正式）或'abacuses'（常用）。"
    },
    history: {
      en: "The abacus has been used across many ancient civilizations including Mesopotamia, Egypt, Persia, Greece, Rome, China, and Japan. The Chinese abacus (suanpan) and Japanese abacus (soroban) are still in use today. Before electronic calculators, the abacus was the most widely used calculation tool for merchants and mathematicians alike.",
      zh: "算盘在许多古代文明中都有使用，包括美索不达米亚、埃及、波斯、希腊、罗马、中国和日本。中国算盘（算盘）和日本算盘（珠算）至今仍在使用。在电子计算器出现之前，算盘是商人和数学家最广泛使用的计算工具。"
    },
    forms: {
      en: "Singular: abacus\nPlural: abaci (formal) or abacuses (common)",
      zh: "单数：abacus\n复数：abaci（正式）或abacuses（常用）"
    },
    memoryAid: {
      en: "Think of 'A-Basic-Calculator-Used-Since' ancient times - taking the first letters gives you something close to 'abacus'!",
      zh: "想象'A-Basic-Calculator-Used-Since'（自古以来使用的基本计算器）- 取首字母会得到接近'abacus'的组合！"
    },
    trendingStory: {
      en: "In a surprising trend among Silicon Valley tech executives, traditional abacuses have become the latest status symbol in meeting rooms. \"There's something powerful about disconnecting from digital while still crunching numbers,\" explains tech CEO Lisa Chen. \"When I slide these beads during negotiations, it creates a psychological pause that digital tools can't replicate.\" This renaissance of ancient technology amidst cutting-edge innovation highlights the cycle of rediscovery in our increasingly digital world.",
      zh: "在硅谷科技高管中出现了一个令人惊讶的趋势，传统算盘已成为会议室中最新的地位象征。\"在进行数字运算的同时与数字设备断开连接有一种强大的力量，\"科技公司CEO丽莎·陈解释道。\"当我在谈判中滑动这些珠子时，会产生数字工具无法复制的心理停顿。\"在尖端创新中重新发现古代技术，突显了我们在日益数字化的世界中重新发现的循环。"
    }
  },
  "abalone": {
    phonetic: "/ˌæbəˈloʊni/",
    meaning: "鲍鱼",
    definition: {
      en: "A type of edible sea snail, a marine gastropod mollusk with a flattened shell lined with mother-of-pearl, highly valued as seafood in many cultures.",
      zh: "一种可食用的海螺，是一种海洋腹足类软体动物，扁平的贝壳内层为珍珠母，在许多文化中作为海鲜备受推崇。"
    },
    examples: {
      en: [
        "The restaurant specializes in abalone dishes prepared in traditional ways.",
        "Poaching has become a serious threat to wild abalone populations.",
        "The iridescent interior of an abalone shell makes it popular for decorative uses."
      ],
      zh: [
        "这家餐厅专门提供以传统方式烹制的鲍鱼菜肴。",
        "偷猎已经成为野生鲍鱼种群的严重威胁。",
        "鲍鱼壳的彩虹色内部使其成为装饰用途的热门选择。"
      ]
    },
    etymology: {
      en: "The word 'abalone' entered English from Spanish 'abulón', which came from the Native American Rumsen language word 'aulón' or 'aulon'.",
      zh: "'abalone'一词进入英语来自西班牙语'abulón'，而西班牙语词源于美洲原住民Rumsen语言中的'aulón'或'aulon'。"
    },
    affixes: {
      en: "The word 'abalone' is a base word without prefixes or suffixes. There are no common derivatives.",
      zh: "'abalone'是一个没有前缀或后缀的基本词。没有常见的派生词。"
    },
    history: {
      en: "Abalone has been an important food source and cultural item for coastal peoples around the world for thousands of years. Indigenous peoples of North America's Pacific coast, Aboriginal Australians, and various Asian cultures have harvested abalone for food and used their shells for decoration and currency. In recent decades, wild abalone populations have declined dramatically due to overfishing, poaching, and disease, leading to strict fishing regulations and the development of abalone aquaculture.",
      zh: "几千年来，鲍鱼一直是世界各地沿海人民重要的食物来源和文化物品。北美太平洋沿岸的原住民、澳大利亚土著和各种亚洲文化都采集鲍鱼作为食物，并使用它们的贝壳作为装饰和货币。近几十年来，由于过度捕捞、偷猎和疾病，野生鲍鱼数量急剧减少，导致了严格的捕捞规定和鲍鱼水产养殖的发展。"
    },
    forms: {
      en: "Singular: abalone\nPlural: abalones or abalone (both are acceptable)",
      zh: "单数：abalone\n复数：abalones或abalone（两者都可接受）"
    },
    memoryAid: {
      en: "Think of 'A-Balloon-Knee' (sounds similar to abalone). Imagine a sea snail with a shell shaped like a balloon resting on what looks like a knee!",
      zh: "想象'A-Balloon-Knee'（听起来类似于abalone）。想象一个贝壳形状像气球一样的海螺，放在看起来像膝盖的东西上！"
    },
    trendingStory: {
      en: "Climate scientists and Indigenous knowledge keepers are forming unprecedented partnerships to protect the threatened abalone. \"What we're seeing in abalone populations is an early warning system for ocean health,\" explains marine biologist Dr. James Wong. The collaborative effort combines traditional harvest practices with cutting-edge monitoring technology. Meanwhile, sustainable abalone farming startups have attracted record investment as luxury markets seek environmentally responsible alternatives to wild-harvested seafood.",
      zh: "气候科学家和原住民知识守护者正在建立前所未有的伙伴关系，以保护受威胁的鲍鱼。\"我们在鲍鱼种群中看到的是海洋健康的早期预警系统，\"海洋生物学家詹姆斯·王博士解释道。这种合作努力将传统的收获实践与尖端监测技术相结合。与此同时，可持续鲍鱼养殖初创公司已吸引了创纪录的投资，因为奢侈品市场寻求野生海鲜的环保替代品。"
    }
  },
  "abate": {
    phonetic: "/əˈbeɪt/",
    meaning: "减轻、缓和",
    definition: {
      en: "To become less intense or widespread; to decrease in strength or amount. Often used to describe the lessening of pain, storms, or other unpleasant conditions.",
      zh: "变得不那么激烈或广泛；在强度或数量上减少。通常用来描述疼痛、风暴或其他不愉快状况的减轻。"
    },
    examples: {
      en: [
        "The storm finally abated after three days of heavy rain.",
        "His fever began to abate once he started taking the medication.",
        "Public interest in the scandal has not abated despite official denials."
      ],
      zh: [
        "经过三天的大雨，风暴终于减弱了。",
        "开始服药后，他的发热开始减轻。",
        "尽管官方否认，公众对这一丑闻的兴趣并未减弱。"
      ]
    },
    etymology: {
      en: "The word 'abate' comes from Old French 'abatre' meaning 'to beat down, diminish,' which ultimately derives from Late Latin 'abbatere,' consisting of 'ad' (to) + 'batere' (beat).",
      zh: "'abate'一词来源于古法语'abatre'，意为'击倒，减少'，最终源于晚期拉丁语'abbatere'，由'ad'（向）+'batere'（击打）组成。"
    },
    affixes: {
      en: "Root: bate (from Latin 'batere', to beat)\nPrefix: a- (towards, intensifying the action)\nRelated forms include: abatement (noun), abated (past tense), abating (present participle).",
      zh: "词根：bate（来自拉丁语'batere'，击打）\n前缀：a-（朝向，强化动作）\n相关形式包括：abatement（名词），abated（过去式），abating（现在分词）。"
    },
    history: {
      en: "The concept of 'abatement' has historical significance in legal contexts. In medieval English law, an 'abatement of freehold' referred to the wrongful entry upon lands after the death of the owner and before the rightful heir took possession. The term has evolved to be used in many contexts, from legal 'tax abatements' to environmental 'noise abatement' programs.",
      zh: "'abatement'（减轻）一词在法律背景下具有历史意义。在中世纪英国法律中，'abatement of freehold'指的是在土地所有者去世后、合法继承人接管前对土地的非法侵入。该术语已发展为在多种情境中使用，从法律上的'税收减免'到环境保护中的'噪音消减'项目。"
    },
    forms: {
      en: "Present: abate, abates\nPast: abated\nPast participle: abated\nPresent participle: abating\nNoun: abatement",
      zh: "现在式：abate, abates\n过去式：abated\n过去分词：abated\n现在分词：abating\n名词：abatement"
    },
    memoryAid: {
      en: "Think of 'A-BATE' as 'A-BATTERY' losing power - just as a battery gradually loses its charge and becomes less powerful, something that abates gradually becomes less intense or powerful.",
      zh: "将'A-BATE'想象为'A-BATTERY'（电池）失去电力 - 就像电池逐渐失去电量变得不那么强大一样，abate的事物逐渐变得不那么激烈或强大。"
    },
    trendingStory: {
      en: "Climate researchers report that despite global efforts, carbon emissions have not abated at the rate needed to meet international climate goals. \"We're seeing temporary abatements followed by rebounds,\" explains climate scientist Dr. Elena Rodriguez. This pattern has prompted a new approach among environmentalists, focusing on 'abatement accelerators' - technologies that can rapidly decrease emissions in high-polluting industries while sustainable alternatives are developed. The term 'abate' has consequently become central in climate policy discussions worldwide.",
      zh: "气候研究人员报告称，尽管全球做出了努力，但碳排放并未以实现国际气候目标所需的速度减少。\"我们看到的是暂时的减排后跟着反弹，\"气候科学家埃琳娜·罗德里格斯博士解释道。这种模式促使环保主义者采取新方法，专注于'减排加速器'——能够在开发可持续替代方案的同时，迅速减少高污染行业排放的技术。因此，'abate'一词已成为全球气候政策讨论的核心。"
    }
  }
};

// Function to get a word from the database
export const getWordData = (word: string): WordData | null => {
  return wordDatabase[word.toLowerCase()] || null;
};

// Function to get word list
export const getWordList = (): string[] => {
  return Object.keys(wordDatabase);
};

// Function to get next word
export const getNextWord = (currentWord: string): string => {
  const words = getWordList();
  const currentIndex = words.indexOf(currentWord.toLowerCase());
  
  // If word not found or is the last word, return the first word
  if (currentIndex === -1 || currentIndex === words.length - 1) {
    return words[0];
  }
  
  return words[currentIndex + 1];
};

// Function to get previous word
export const getPreviousWord = (currentWord: string): string => {
  const words = getWordList();
  const currentIndex = words.indexOf(currentWord.toLowerCase());
  
  // If word not found or is the first word, return the last word
  if (currentIndex === -1 || currentIndex === 0) {
    return words[words.length - 1];
  }
  
  return words[currentIndex - 1];
};