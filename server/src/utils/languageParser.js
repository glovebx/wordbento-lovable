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