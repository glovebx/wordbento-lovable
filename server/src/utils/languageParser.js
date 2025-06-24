export function extractTextFromSrt(srtContent) {
    // 1. 按空行分割成字幕块
    const blocks = srtContent.split(/\r?\n\s*\r?\n/);
    
    // 2. 处理每个字幕块
    const textLines = [];
    
    for (const block of blocks) {
        if (!block.trim()) continue;  // 跳过空块
        
        // 3. 按行分割并跳过前两行（序号和时间行）
        const lines = block.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 3) continue;  // 无效块
        
        // 4. 提取文本行（第三行开始）
        const textBlock = lines.slice(2).join("\n").trim();
        
        if (textBlock) {
            textLines.push(textBlock);
        }
    }
    
    // // 5. 合并所有文本块（保留原始换行）
    // return textLines.join("\n\n");
    // 5. 合并所有文本块（换行合并）
    return textLines.join("\n");
}

/**
 * 修复一个可能包含未转义双引号和无效空白字符的JSON字符串。
 * @param {string} badJsonString - 格式错误的JSON字符串。
 * @returns {string} - 格式修复后的JSON字符串。
 */
export function fixUnescapedQuotesInJson(badJsonString) {
    // **错误修复**:
    // 步骤 1: 清理无效的空白字符, 比如不间断空格 (\u00A0)。
    // JSON.parse 对空白字符有严格要求，此步骤可防止初始解析错误。
    const cleanedString = badJsonString.replace(/[\u00A0]/g, ' ');

    // 步骤 2: 使用正则表达式修复未转义的双引号。
    // 这个正则表达式是解决问题的关键。
    // 它会查找 "en" 或 "zh" 字段，并智能地捕获其完整的、可能包含未转义引号的字符串值。
    //
    // 正则表达式详解:
    // 1. ("(?:en|zh)"\s*:\s*)"
    //    - 第1捕获组 `(...)`: 捕获键的部分，例如 `"en": ` 或 `"zh": `。
    //    - `"(?:en|zh)"`: 匹配 "en" 或 "zh" 字符串。
    //    - `\s*:\s*`: 匹配键和值之间的冒号和可选的空格。
    //    - `"`: 匹配值的起始双引号。
    //
    // 2. ((?:(?!"\s*[,\}]).)*)
    //    - 第2捕获组 `(...)`: 这是核心，用于捕获字符串的实际内容。
    //    - `(?: ... )*`: 匹配内部模式零次或多次。
    //    - `(?! ... )`: 这是一个 "负向先行断言" (negative lookahead)。它确保当前位置后面的字符不符合特定模式，但它本身不消耗任何字符。
    //    - `!"\s*[,\}]`: 我们断言的模式是：一个双引号 `"`，后面跟着任意空格 `\s*`，然后是一个逗号 `,` 或一个右大括号 `}`。这精确地定义了一个JSON字符串值的结束标志。
    //    - `.`: 如果先行断言成功（即我们还没到字符串的末尾），则匹配任何单个字符（除了换行符，但我们用了 `s` 标志，所以它能匹配所有字符）。
    //
    // 3. /gs 标志
    //    - `g` (global): 匹配字符串中所有的实例，而不仅仅是第一个。
    //    - `s` (dotAll): 允许 `.` 匹配换行符，这对于处理多行字符串至关重要。
    const regex = /("(?:en|zh)"\s*:\s*)"((?:(?!"\s*[,\}]).)*)"/gs;

    // 在清理过的字符串上执行替换操作。
    return cleanedString.replace(regex, (match, keyPart, valueContent) => {
        // match: 完整的匹配项, e.g., `"en": "some "quoted" text"`
        // keyPart: 第1捕获组, e.g., `"en": "`
        // valueContent: 第2捕获组, e.g., `some "quoted" text`

        // 在捕获到的内容中，将所有双引号替换为转义后的双引号。
        const escapedValue = valueContent.replace(/"/g, '\\"');

        // 重新组合成一个有效的键值对。
        return `${keyPart}"${escapedValue}"`;
    });
}