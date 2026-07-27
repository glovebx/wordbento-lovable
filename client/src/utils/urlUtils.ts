export const getImageKey = (url: string) => {
    const imageKey = url.split('/').pop() ?? '';
    // 可能包含?参数，需要移除
    return imageKey.split('?')[0];
}