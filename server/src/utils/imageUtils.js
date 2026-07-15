import { Jimp } from 'jimp';
import { FONT_SIZE, FONT_DATA } from './font-data.js';
import axios from 'axios';

const MAX_IMAGE_SIZE = 100 * 1024; // 80KB

/**
 * Compresses an image buffer to be under a specific size.
 * @param {Buffer} buffer The input image buffer.
 * @returns {Promise<Buffer>} The compressed image buffer.
 */
export async function compressImageBuffer(buffer, maxImageSize = MAX_IMAGE_SIZE) {
    if (buffer.byteLength <= maxImageSize) {
        return buffer; // No need to compress
    }

    try {
        console.log(`Image size (${(buffer.byteLength / 1024).toFixed(2)} KB) exceeds limit, attempting to compress...`);
        const image = await Jimp.read(buffer);
        let quality = 80;

        for (let q = quality; q >= 10; q -= 10) {
            // const compressedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
            const compressedBuffer = await image.getBuffer("image/jpeg", {
                quality: q
            });
            console.log(`  - Trying quality ${q}, size: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);

            if (compressedBuffer.length <= maxImageSize) {
                console.log(`  - Compression successful.`);
                return compressedBuffer;
            }
            // If it's the last attempt and still too large, we will return this last compressed buffer.
            if (q === 10) {
                console.log(`  - [Warning] Could not compress below target size. Using last compressed result.`);
                return compressedBuffer;
            }
        }
    } catch (error) {
        console.error("Image compression with Jimp failed:", error);
    }

    return buffer; // Fallback to original buffer on failure or if all attempts fail
}


// 缓存解码后的 Jimp 图像
const glyphCache = new Map();

async function getGlyph(char) {
    if (glyphCache.has(char)) {
        return glyphCache.get(char);
    }
    
    const info = FONT_DATA[char];
    if (!info) {
        // 未知字符，返回空格
        return null;
    }
    
    if (!info.data) {
        // 空白字符（如空格）
        return { width: info.w, height: info.h, image: null };
    }
    
    // base64 解码为 Buffer
    const buffer = Buffer.from(info.data, 'base64');
    const image = await Jimp.read(buffer);
    
    const glyph = { width: info.w, height: info.h, image };
    glyphCache.set(char, glyph);
    return glyph;
}

async function measureText(text) {
    let totalWidth = 0;
    let maxHeight = 0;
    
    for (const char of text) {
        const glyph = await getGlyph(char);
        if (glyph) {
            totalWidth += glyph.width + 2; // 字间距
            maxHeight = Math.max(maxHeight, glyph.height);
        }
    }
    
    return { width: totalWidth, height: maxHeight };
}

async function drawText(image, text, startX, startY) {
    let currentX = startX;
    
    for (const char of text) {
        const glyph = await getGlyph(char);
        if (!glyph) continue;
        
        if (glyph.image) {
            // 计算垂直居中偏移
            const yOffset = Math.floor((FONT_SIZE - glyph.height) / 2);
            image.composite(glyph.image, currentX, startY + yOffset, {
                mode: 'srcOver',
                opacitySource: 1,
                opacityDest: 1
            });
        }
        
        currentX += glyph.width + 2;
    }
    
    return currentX - startX;
}

/**
 * Adds pronunciation text to an image at a random position, then compresses.
 * The text is rendered with a semi-transparent dark background (subtitle-style).
 * @param {Buffer} buffer The input image buffer.
 * @param {string} pronunciation The phonetic transcription to add (e.g. "/ˈtɜːr.kwɔɪz/").
 * @param {number} maxImageSize Maximum target file size in bytes (default 100KB).
 * @returns {Promise<Buffer>} The processed image buffer.
 */
export async function compressImageBufferWithPronunciation(buffer, pronunciation, maxImageSize = MAX_IMAGE_SIZE) {
    if (!pronunciation) {
        return compressImageBuffer(buffer, maxImageSize);
    }

    try {
        console.log(`Adding pronunciation "${pronunciation}" to image...`);
        const image = await Jimp.read(buffer);
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        
        // 测量文字尺寸
        const { width: textWidth, height: textHeight } = await measureText(pronunciation);
        
        const paddingX = 14;
        const paddingY = 10;
        const bgWidth = textWidth + paddingX * 2;
        const bgHeight = Math.max(textHeight + paddingY * 2, FONT_SIZE + paddingY * 2);
        
        // 随机位置（确保不超出边界）
        const maxX = Math.max(0, width - bgWidth);
        const maxY = Math.max(0, height - bgHeight);
        const randomX = Math.floor(Math.random() * maxX);
        const randomY = Math.floor(Math.random() * maxY);
        
        // 绘制半透明黑色背景
        const bgImage = new Jimp({ 
            width: bgWidth, 
            height: bgHeight, 
            color: 0x000000B3  // ARGB: 70% 透明度黑色
        });
        
        image.composite(bgImage, randomX, randomY, {
            mode: 'srcOver',
            opacitySource: 0.7,
            opacityDest: 1
        });
        
        // 绘制白色音标文字
        const textX = randomX + paddingX;
        const textY = randomY + paddingY;
        await drawText(image, pronunciation, textX, textY);
        

        // // --- Compression logic ---
        // if (buffer.byteLength <= maxImageSize) {
        //     return await image.getBuffer("image/jpeg", { quality: 90 });
        // }

        console.log(`Image size (${(buffer.byteLength / 1024).toFixed(2)} KB) exceeds limit, attempting to compress...`);
        let quality = 80;

        for (let q = quality; q >= 10; q -= 10) {
            const compressedBuffer = await image.getBuffer("image/jpeg", { quality: q });
            console.log(`  - Trying quality ${q}, size: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);

            if (compressedBuffer.length <= maxImageSize) {
                console.log(`  - Compression successful.`);
                return compressedBuffer;
            }
            if (q === 10) {
                console.log(`  - [Warning] Could not compress below target size. Using last compressed result.`);
                return compressedBuffer;
            }
        }
    } catch (error) {
        console.error("Image processing with pronunciation failed:", error);
    }

    return buffer;
}

/**
 * Downloads an image from a URL, compresses it, and converts it to a Base64 string.
 * @param {string} url The URL of the image to process.
 * @returns {Promise<string|null>} The Base64 encoded image data URI, or null if an error occurs.
 */
export async function processImage2Base64(url, maxImageSize = MAX_IMAGE_SIZE) {
    if (!url) return null;

    try {
        console.log(`Downloading image from ${url}`);
        // 1. Download image
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            // proxy: {
            //     host: '127.0.0.1',
            //     port: 8001,
            //     protocol: 'http'
            // },
            timeout: 60000 // 60 seconds timeout
        });
        const originalBuffer = Buffer.from(response.data, 'binary');
        console.log(`Original image size: ${(originalBuffer.byteLength / 1024).toFixed(2)} KB`);
        
        // 2. Compress image
        const compressedBuffer = await compressImageBuffer(originalBuffer, maxImageSize);
        console.log(`Compressed image size: ${(compressedBuffer.byteLength / 1024).toFixed(2)} KB`);    

        // 3. Convert to Base64
        const base64 = compressedBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64}`;

    } catch (error) {
        console.error(`Failed to process image from ${url}:`, error.message);
        return null;
    }
}

/**
 * Downloads an image from a URL and compresses it.
 * @param {string} url The URL of the image to process.
 * @returns {Promise<Buffer|null>} The compressed image buffer, or null if an error occurs.
 */
export async function downloadAndCompressImage(url, maxImageSize = MAX_IMAGE_SIZE) {
    if (!url) return null;

    try {
        // 1. Download image
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const originalBuffer = Buffer.from(response.data, 'binary');

        // 2. Compress image
        const compressedBuffer = await compressImageBuffer(originalBuffer, maxImageSize);

        return compressedBuffer;
    } catch (error) {
        console.error(`Failed to download and compress image from ${url}:`, error.message);
        return null;
    }
}
