import requests
import json
import time
import os
from typing import Dict, List, Optional
from urllib.parse import urlparse
import datetime
import io
from PIL import Image
from publisher.word_bento_client import WordBentoClient

def get_average_color(pixels):
    num_pixels = len(pixels)
    if num_pixels == 0:
        return (0, 0, 0)
    
    total_r, total_g, total_b = 0, 0, 0
    for pixel in pixels:
        # Handle both RGB and RGBA
        total_r += pixel[0]
        total_g += pixel[1]
        total_b += pixel[2]
        
    return (int(total_r / num_pixels), int(total_g / num_pixels), int(total_b / num_pixels))

def download_image(url: str, path: str) -> bool:
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        img_data = io.BytesIO(response.content)
        img = Image.open(img_data).convert("RGB")
        w, h = img.size

        target_w, target_h = 1080, 1920
        target_ratio = target_w / target_h
        img_ratio = w / h

        if abs(img_ratio - target_ratio) > 0.01:  # Not 9:16
            print(f"图片非9:16，正在应用颜色填充: {url}")
            final_img = Image.new('RGB', (target_w, target_h))

            if img_ratio > target_ratio:  # 偏宽，垂直填充
                new_h = int(target_w / img_ratio)
                resized_img = img.resize((target_w, new_h), Image.LANCZOS)
                pad_h = target_h - new_h
                top_pad = pad_h // 2

                top_row_pixels = [img.getpixel((x, 0)) for x in range(w)]
                bottom_row_pixels = [img.getpixel((x, h - 1)) for x in range(w)]
                top_color = get_average_color(top_row_pixels)
                bottom_color = get_average_color(bottom_row_pixels)

                final_img.paste(top_color, (0, 0, target_w, top_pad))
                final_img.paste(resized_img, (0, top_pad))
                final_img.paste(bottom_color, (0, top_pad + new_h, target_w, target_h))
            else:  # 偏高，水平填充
                new_w = int(target_h * img_ratio)
                resized_img = img.resize((new_w, target_h), Image.LANCZOS)
                pad_w = target_w - new_w
                left_pad = pad_w // 2
                
                # 根据用户要求，水平填充也使用顶部和底部的颜色
                top_row_pixels = [img.getpixel((x, 0)) for x in range(w)]
                bottom_row_pixels = [img.getpixel((x, h - 1)) for x in range(w)]
                side_color = get_average_color(top_row_pixels + bottom_row_pixels)

                final_img.paste(side_color, (0, 0, left_pad, target_h))
                final_img.paste(resized_img, (left_pad, 0))
                final_img.paste(side_color, (left_pad + new_w, 0, target_w, target_h))
            
            final_img.save(path, 'JPEG', quality=95)
        
        else:  # 是9:16
            if w != target_w or h != target_h:
                print(f"正在将9:16图片缩放到1080x1920: {url}")
                resized_img = img.resize((target_w, target_h), Image.LANCZOS)
                resized_img.save(path, 'JPEG', quality=95)
            else:
                print(f"图片已是1080x1920，直接保存: {url}")
                img.save(path, 'JPEG', quality=95)

        return True
    except requests.exceptions.RequestException as e:
        print(f"下载图片失败: {url}, {e}")
        return False
    except Exception as e:
        print(f"处理或保存图片失败: {url}, {e}")
        return False

import webbrowser
import shutil

CACHE_FILE = "publisher/video/cover_cache.json"

def get_cache_key(words: List[str]) -> str:
    """根据单词列表生成一个唯一的、排序的缓存键"""
    return "_".join(sorted([w.lower() for w in words]))

def load_cache() -> Dict:
    """加载封面缓存文件"""
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        print("警告: 无法读取缓存文件，将创建新的缓存。")
        return {}

def save_cache(cache_data: Dict):
    """保存封面缓存到文件"""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=4, ensure_ascii=False)
    except IOError as e:
        print(f"错误: 无法写入缓存文件: {e}")

def are_files_cached(file_paths: List[str]) -> bool:
    """检查所有缓存的文件路径是否存在"""
    return all(os.path.exists(p) for p in file_paths)

def prompt_for_cover_selection(image_urls: List[str]) -> Optional[str]:
    """在浏览器中打开图片并提示用户选择"""
    if not image_urls:
        print("没有可供选择的封面图片。")
        return None

    print("将在浏览器中打开候选封面图片...")
    for i, url in enumerate(image_urls):
        print(f"  {i+1}: {url}")
        webbrowser.open_new_tab(url)

    while True:
        try:
            choice = input(f"请从 1 到 {len(image_urls)} 中选择一张作为封面 (输入数字): ")
            choice_index = int(choice) - 1
            if 0 <= choice_index < len(image_urls):
                selected_url = image_urls[choice_index]
                print(f"您选择了: {selected_url}")
                return selected_url
            else:
                print("无效选择，请输入列表中的数字。")
        except (ValueError, IndexError):
            print("输入无效，请输入一个数字。")


def main():
    BASE_URL = "http://192.168.3.58:8787"
    AUTH_KEY = "fa2357b2-4fbe-4a42-8901-300571fc6cfa"
    STATE_FILE = "video_word_state.json"  # 状态存储文件
        
    client = WordBentoClient(BASE_URL, AUTH_KEY, STATE_FILE)

    try:
        all_today_words_response = client.get_today_words(0)
        all_today_words = all_today_words_response.get('data', [])
        today_words_summary = all_today_words[-5:]

        if not today_words_summary or len(today_words_summary) < 5:
            print("获取今日5个单词失败")
            return

        words_details = []
        for word_summary in today_words_summary:
            details = client.get_word_details(word_summary['word_text'])
            if details:
                words_details.append(details)
        
        if len(words_details) < 3:
            print("获取完整的3个单词详情失败")
            return

        word_texts = [w['word_text'] for w in words_details]
        folder_name_slug = "_".join(word_texts)
        output_dir = os.path.join("publisher", "video", folder_name_slug)
        image_dir = os.path.join(output_dir, "png")
        os.makedirs(image_dir, exist_ok=True)

        # --- Generate Cover Image ---
        cover_filename = "cover.jpg"
        cover_output_path = os.path.join(image_dir, cover_filename)
        cache_key = get_cache_key(word_texts)
        cover_cache = load_cache()
        local_cover_paths = []

        if cache_key in cover_cache and are_files_cached(cover_cache[cache_key]):
            print("发现有效的封面缓存，将使用本地文件。")
            local_cover_paths = cover_cache[cache_key]
        else:
            print("未找到有效缓存，正在从API生成新封面...")
            cover_image_urls = client.generate_cover_images(word_texts)
            if not cover_image_urls:
                print("无法获取封面图片，正在退出。")
                return

            # 下载所有候选图片
            covers_dir = os.path.join(output_dir, "covers")
            os.makedirs(covers_dir, exist_ok=True)
            for i, url in enumerate(cover_image_urls):
                local_path = os.path.join(covers_dir, f"candidate_{i+1}.jpg")
                if download_image(url, local_path):
                    local_cover_paths.append(os.path.abspath(local_path))
            
            # 更新缓存
            if local_cover_paths:
                cover_cache[cache_key] = local_cover_paths
                save_cache(cover_cache)

        if not local_cover_paths:
            print("没有可用的封面图片，正在退出。")
            return

        # 从本地文件预览和选择
        selected_cover_path = prompt_for_cover_selection(local_cover_paths)
        if not selected_cover_path:
            print("未选择封面图片，正在退出。")
            return

        # 复制选择的封面到最终位置
        print(f"正在复制选择的封面: {selected_cover_path}")
        shutil.copy(selected_cover_path, cover_output_path)

        print(f"封面已成功保存到: {cover_output_path}")

        # --- Generate meta.json ---
        definitions = []
        for word in words_details:
            # Add definition scene
            definitions.append(word.get('content', {}).get('definition', {}).get('en', '') + '\n' + word['word_text'])
        
        meta_data = {
            "title": "\\n".join(word_texts),
            "cover": cover_filename,
            "image_url": "",
            "url": "",
            "domain": "word.metaerp.ai",
            "full_domain": "word.metaerp.ai",
            "config": {"lang": "en_US", "vocal": "", "style": "", "avatar": "", "mode": "video"},
            "prompt": {"text2": ""},
            "label": {"text2": ""},
            "author": "4s背单词",
            "ending": "assets/4swords_with_silence.mp4",
            "title2": "\\n".join(word_texts),
            "highlights": word_texts,
            "xhs": {
                "title": f"单词打卡：{word_texts[0]}, {word_texts[1]}, {word_texts[2]}",
                "desc": '\n\n'.join(definitions),
                "tags": ['单词打卡', '每日单词', '英语学习', '英语单词速记', '英语词汇', '单词记忆法', '日常英语']
            },
            "music": "Young_and_Beautiful.mp3",
            "zoom_effect_in_clip": True,
            "settings": {
                "title": {
                    "color": "#FFFF00",
                    "stroke": {"color": "#000000", "width": 2}
                }
            }
        }

        with open(os.path.join(output_dir, 'meta.json'), 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, indent=4, ensure_ascii=False)

        # --- Generate content.json ---
        content_data = []
        for i, word in enumerate(words_details):
            image_filename = f"{word['word_text']}_1.jpg"
            download_image(word['imageUrls'][0], os.path.join(image_dir, image_filename))

            # Definition scene
            content_data.append({
                "image": f"{image_filename}",
                "image_url": word['imageUrls'][0] if word.get('imageUrls') else "",
                "text": word.get('meaning'),
                "status_id": f"{i+1}0",
                "text2": word.get('meaning'),
                "lines": [
                    {"index": 0, "text2": f"{word.get('word_text')} {word.get('meaning')}"},
                    {"index": 1, "text2": word.get('content', {}).get('definition', {}).get('en', '')}
                ]
            })
            # Example scenes
            for j, example in enumerate(word.get('content', {}).get('examples', {}).get('en', [])[:3]):
                imageUrl = word['imageUrls'][j+1] if len(word.get('imageUrls', [])) > j+1 else ""
                if not imageUrl:
                    break

                cn_example = word.get('content', {}).get('examples', {}).get('zh', [])[j]
                image_filename_example = f"{word['word_text']}_{j+2}.jpg"
                download_image(imageUrl, os.path.join(image_dir, image_filename_example))

                content_data.append({
                    "image": f"{image_filename_example}",
                    "image_url": imageUrl,
                    "text": cn_example,
                    "status_id": f"{i+1}{j+1}",
                    "text2": example,
                    "lines": [{"index": 0, "text2": example}]
                })

            # # Example scenes
            # imageUrls = word.get('imageUrls', [])[1:]
            # for j, imageUrl in enumerate[Any](imageUrls) :
            #     image_filename_example = f"{word['word_text']}_{j+2}.jpg"
            #     download_image(imageUrl, os.path.join(image_dir, image_filename_example))

            #     content_data.append({
            #         "image": f"{image_filename_example}",
            #         "image_url": imageUrl,
            #         "text": image_prompt,
            #         "status_id": f"{i+1}{j+1}",
            #         "text2": image_prompt,
            #         "lines": [{"index": 0, "text2": image_prompt}]
            #     })

        with open(os.path.join(output_dir, 'content.json'), 'w', encoding='utf-8') as f:
            json.dump(content_data, f, indent=4, ensure_ascii=False)

        print(f"成功生成文件，保存在目录: {output_dir}")

    finally:
        client.close()

if __name__ == "__main__":
    main()
