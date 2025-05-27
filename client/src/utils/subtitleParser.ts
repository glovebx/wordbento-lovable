// utils/subtitleParser.ts (or directly in your component)

export interface SubtitleCue {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

// Helper to convert HH:MM:SS,ms to seconds
const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const secondsAndMs = parts[2].split(',');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsAndMs[0], 10);
  const milliseconds = parseInt(secondsAndMs[1], 10);
  return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
};

// export const parseSrt = (srtContent: string): SubtitleCue[] => {
//   const cues: SubtitleCue[] = [];
//   const lines = srtContent.trim().split(/\r?\n/); // 直接按行分割

//   let currentCue: SubtitleCue | null = null;

//   lines.forEach(line => {
//     line = line.trim();

//     if (!line) { // 跳过空行
//       if (currentCue) {
//         cues.push(currentCue);
//         currentCue = null;
//       }
//       return;
//     }

//     // 尝试解析ID
//     if (!currentCue && /^\d+$/.test(line)) {
//       currentCue = { id: parseInt(line, 10), startTime: 0, endTime: 0, text: '' };
//       return;
//     }

//     // 尝试解析时间戳
//     const timeMatch = line.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
//     if (currentCue && timeMatch) {
//       currentCue.startTime = parseTimeToSeconds(timeMatch[1]);
//       currentCue.endTime = parseTimeToSeconds(timeMatch[2]);
//       return;
//     }

//     // 解析字幕文本
//     if (currentCue) {
//       if (currentCue.text) {
//         currentCue.text += '\n' + line; // 多行字幕文本
//       } else {
//         currentCue.text = line;
//       }
//     }
//   });

//   // 处理文件末尾没有空行的情况
//   if (currentCue) {
//     cues.push(currentCue);
//   }

//   return cues;
// };
export const parseSrt = (isMobile: boolean, srtContent: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];

  // 匹配一个完整的SRT字幕块的正则表达式
  // 1. (\d+): 匹配字幕ID
  // 2. (\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}): 匹配时间戳
  // 3. (.*?)(?=\s*\d+\s*\d{2}:\d{2}:\d{2},\d{3} -->|\s*$)
  //    - (.*?): 匹配非贪婪模式的字幕文本
  //    - (?=\s*\d+\s*\d{2}:\d{2}:\d{2},\d{3} -->|\s*$)
  //      这是一个正向先行断言，表示文本后面要么跟着一个新的字幕块的ID和时间戳，
  //      要么是字符串的结尾。这确保我们捕获了当前字幕的所有文本，直到下一个字幕块的开始。
  const srtBlockRegex = /(\d+)\s*(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3})\s*(.*?)(?=\s*\d+\s*\d{2}:\d{2}:\d{2},\d{3}\s*-->|\s*$)/gs;


  let match;
  while ((match = srtBlockRegex.exec(srtContent)) !== null) {
    const id = parseInt(match[1], 10);
    const timeString = match[2];
    const text = match[3].trim(); // 获取文本并去除首尾空格

    const timeMatch = timeString.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);

    if (id && timeMatch) {
      const startTime = parseTimeToSeconds(timeMatch[1]);
      const endTime = parseTimeToSeconds(timeMatch[2]);
      cues.push({ id, startTime, endTime, text });
    }
  }

  // 1. 先对原始解析的字幕进行时间戳交叉修复 (这一步是必要的，否则合并后的时间可能会更乱)
  let fixedCues = fixSrtTimestampOverlaps(cues);
  // 2. 根据isMobile参数决定是否进行字幕合并，并在此处分配连续ID
  const processedCues = processCuesForDisplay(fixedCues, isMobile);
  // 3. 对合并后的字幕再次进行时间戳交叉修复 (因为合并可能再次引入交叉)
  // 这一步非常重要，尤其是在合并逻辑中如果没有精确控制endTime时。
  fixedCues = fixSrtTimestampOverlaps(processedCues);

  return fixedCues;
};

/**
 * 将两段字幕合并成一条新的字幕。
 * @param cue1 第一条字幕。
 * @param cue2 第二条字幕。
 * @returns 合并后的新字幕。
 */
const mergeTwoCues = (cue1: SubtitleCue, cue2: SubtitleCue): SubtitleCue => {
  return {
    // ID可以根据实际需求生成，这里简单地使用第一条的ID
    id: cue1.id,
    // 新字幕的开始时间是第一条的开始时间
    startTime: cue1.startTime,
    // 新字幕的结束时间是第二条的结束时间
    endTime: cue2.endTime,
    // 文字以空格连接合并
    text: `${cue1.text} ${cue2.text}`,
  };
};

/**
 * 根据是否为PC端，将原始字幕进行合并处理，并分配连续的ID。
 * 当为PC端时，每两条字幕合并成一条。
 *
 * @param originalCues 原始解析的字幕数组。
 * @param isMobile 是否为手机端。
 * @returns 处理后的字幕数组。
 */
export const processCuesForDisplay = (originalCues: SubtitleCue[], isMobile: boolean): SubtitleCue[] => {
  if (isMobile) {
    // 手机端直接返回原始字幕，但仍然需要确保ID是连续的，以防原始文件不规范
    return originalCues.map((cue, index) => ({ ...cue, id: index + 1 }));
  }

  const mergedCues: SubtitleCue[] = [];
  let currentId = 1; // 从1开始分配ID

  for (let i = 0; i < originalCues.length; i += 2) {
    const cue1 = originalCues[i];
    const cue2 = originalCues[i + 1];

    if (cue1 && cue2) {
      const merged = mergeTwoCues(cue1, cue2);
      mergedCues.push({ ...merged, id: currentId++ });
    } else if (cue1) {
      // 如果只剩一条，则单独添加，并分配ID
      mergedCues.push({ ...cue1, id: currentId++ });
    }
  }
  return mergedCues;
};

/**
 * 消除SRT字幕文件中时间戳交叉的算法。
 * 修改后的版本：用下一个字幕的开始时间减去 minimumGap，来替换上一个字幕的结束时间。
 *
 * @param cues 已经解析的字幕块数组。
 * @param minimumGap 两个字幕之间最小的间隔时间（秒）。默认为0.001秒。
 * @param minimumDuration 单个字幕的最小持续时间（秒）。默认为0.1秒。
 * @returns 消除交叉后的字幕块数组。
 */
export const fixSrtTimestampOverlaps = (
  cues: SubtitleCue[],
  minimumGap: number = 0.001, // 1毫秒的间隔
  minimumDuration: number = 0.1 // 100毫秒的最小持续时间
): SubtitleCue[] => {
  if (cues.length <= 1) {
    return cues; // 如果没有或只有一个字幕，则无需处理
  }

  // 创建一个副本，以便在修改时不会影响原始数组
  const fixedCues: SubtitleCue[] = cues.map(cue => ({ ...cue }));

  for (let i = 0; i < fixedCues.length - 1; i++) {
    const currentCue = fixedCues[i];
    const nextCue = fixedCues[i + 1];

    // 如果下一个字幕的开始时间早于或等于当前字幕的结束时间（或者它们的间隔不足）
    // 调整当前字幕的结束时间为下一个字幕的开始时间减去 minimumGap
    if (nextCue.startTime - currentCue.endTime < minimumGap) {
      currentCue.endTime = nextCue.startTime - minimumGap;
    }

    // 确保当前字幕的持续时间至少为 minimumDuration
    if (currentCue.endTime <= currentCue.startTime) {
      currentCue.endTime = currentCue.startTime + minimumDuration;
    }
  }

  // 最后一条字幕需要单独处理，确保其持续时间有效
  const lastCue = fixedCues[fixedCues.length - 1];
  if (lastCue.endTime <= lastCue.startTime) {
    lastCue.endTime = lastCue.startTime + minimumDuration;
  }

  return fixedCues;
};


export const parseVVT = (srtContent: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const blocks = srtContent.trim().split(/\r?\n\r?\n/); // Split by double newline

  blocks.forEach(block => {
    const lines = block.split(/\r?\n/);
    if (lines.length >= 3) {
      const id = parseInt(lines[0], 10);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);

      if (id && timeMatch) {
        const startTime = parseTimeToSeconds(timeMatch[1]);
        const endTime = parseTimeToSeconds(timeMatch[2]);
        const text = lines.slice(2).join('\n').trim(); // Join remaining lines for text

        cues.push({ id, startTime, endTime, text });
      }
    }
  });
  return cues;
};