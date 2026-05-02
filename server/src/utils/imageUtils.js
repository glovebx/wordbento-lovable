import { Jimp } from 'jimp';
import axios from 'axios';

const MAX_IMAGE_SIZE = 100 * 1024; // 100KB

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

/**
 * Downloads an image from a URL, compresses it, and converts it to a Base64 string.
 * @param {string} url The URL of the image to process.
 * @returns {Promise<string|null>} The Base64 encoded image data URI, or null if an error occurs.
 */
export async function processImage2Base64(url, maxImageSize = MAX_IMAGE_SIZE) {
    if (!url) return null;

    try {
        // 1. Download image
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const originalBuffer = Buffer.from(response.data, 'binary');

        // 2. Compress image
        const compressedBuffer = await compressImageBuffer(originalBuffer, maxImageSize);

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
