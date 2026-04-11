/**
 * Preloads an array of image URLs into the browser cache.
 * This function creates new Image objects and sets their src, which triggers
 * the browser to download them. It returns a promise that resolves when all
 * images have either loaded or failed, ensuring it doesn't block.
 *
 * @param urls - An array of image URL strings to preload.
 * @returns A promise that resolves when all image preloading attempts are complete.
 */
export const preloadImages = (urls: string[]): Promise<void[]> => {
    if (!urls || urls.length === 0) {
        return Promise.resolve([]);
    }

    const promises = urls.map(url => {
        return new Promise<void>((resolve, _) => {
            const img = new Image();
            img.src = url;
            // 'load' and 'error' events will both complete the preloading attempt for this image
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Resolve on error too, so one failed image doesn't stop others
        });
    });

    return Promise.all(promises);
};
