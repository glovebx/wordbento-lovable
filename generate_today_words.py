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

def download_image(url: str, path: str) -> bool:
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        img_data = io.BytesIO(response.content)
        with Image.open(img_data) as img:
            w, h = img.size

            # Check if aspect ratio is approximately 9:16
            is_9_16 = h > 0 and abs((w / h) - (9 / 16)) < 0.01

            if is_9_16 and (w != 1080 or h != 1920):
                print(f"Resizing 9:16 image to 1080x1920: {url}")
                # Resize using high-quality filter
                resized_img = img.convert("RGB").resize((1080, 1920), Image.LANCZOS)
                resized_img.save(path, 'JPEG', quality=95)
            else:
                # If not 9:16 or already correct size, save original content
                with open(path, 'wb') as f:
                    f.write(response.content)

        return True
    except requests.exceptions.RequestException as e:
        print(f"下载图片失败: {url}, {e}")
        return False
    except Exception as e:
        print(f"处理或保存图片失败: {url}, {e}")
        return False

def create_cover_image(image_paths: List[str], output_path: str):
    if not image_paths or len(image_paths) > 3:
        print("需要1到3张图片来创建封面。")
        return

    target_width = 1080
    target_height = 1920
    segment_width = target_width // 3

    new_im = Image.new('RGB', (target_width, target_height))

    for i, path in enumerate(image_paths):
        try:
            with Image.open(path) as img:
                # Crop the middle vertical third of the source image
                w, h = img.size
                left = w / 3
                right = 2 * w / 3
                cropped_img = img.crop((left, 0, right, h))

                # Resize the crop to fit the segment, stretching it
                resized_crop = cropped_img.resize((segment_width, target_height), Image.LANCZOS)

                # Paste into the correct segment
                new_im.paste(resized_crop, (i * segment_width, 0))
        except Exception as e:
            print(f"处理图片 {path} 时失败: {e}")
            # Paste a black box as a fallback for this segment
            black_segment = Image.new('RGB', (segment_width, target_height), color = 'black')
            new_im.paste(black_segment, (i * segment_width, 0))
    
    # If there are fewer than 3 images, fill the remaining segments with black
    for i in range(len(image_paths), 3):
        black_segment = Image.new('RGB', (segment_width, target_height), color = 'black')
        new_im.paste(black_segment, (i * segment_width, 0))

    new_im.save(output_path)

def main():
    BASE_URL = "http://192.168.3.58:8787"
    AUTH_KEY = "fa2357b2-4fbe-4a42-8901-300571fc6cfa"
    STATE_FILE = "video_word_state.json"  # 状态存储文件
        
    client = WordBentoClient(BASE_URL, AUTH_KEY, STATE_FILE)

    try:
        all_today_words_response = client.get_today_words(0)
        all_today_words = all_today_words_response.get('data', [])
        today_words_summary = all_today_words[:3]

        if not today_words_summary or len(today_words_summary) < 3:
            print("获取今日3个单词失败")
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

        # --- Generate meta.json ---
        cover_image_paths = []
        for i, word in enumerate(words_details):
            if word.get('imageUrls') and len(word['imageUrls']) > 0:
                img_path = os.path.join(image_dir, f"cover_{i}.jpg")
                if download_image(word['imageUrls'][0], img_path):
                    cover_image_paths.append(img_path)

        cover_filename = "cover.jpg"
        cover_output_path = os.path.join(image_dir, cover_filename)
        create_cover_image(cover_image_paths, cover_output_path)
        
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
            "title2": "\\n".join(word_texts),
            "highlights": word_texts,
            "xhs": {
                "title": f"每日英语学习：{word_texts[0]}, {word_texts[1]}, {word_texts[2]}",
                "desc": f"今天我们来学习三个有用的单词：{word_texts[0]}, {word_texts[1]}, 和 {word_texts[2]}。通过例句和图片加深理解。",
                "tags": "#英语学习 #每日单词 #单词打卡"
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
                cn_example = word.get('content', {}).get('examples', {}).get('zh', [])[j]
                image_filename_example = f"{word['word_text']}_{j+2}.jpg"
                if len(word.get('imageUrls', [])) > j+1:
                    download_image(word['imageUrls'][j+1], os.path.join(image_dir, image_filename_example))

                content_data.append({
                    "image": f"{image_filename_example}",
                    "image_url": word['imageUrls'][j+1] if len(word.get('imageUrls', [])) > j+1 else "",
                    "text": cn_example,
                    "status_id": f"{i+1}{j+1}",
                    "text2": example,
                    "lines": [{"index": 0, "text2": example}]
                })

        with open(os.path.join(output_dir, 'content.json'), 'w', encoding='utf-8') as f:
            json.dump(content_data, f, indent=4, ensure_ascii=False)

        print(f"成功生成文件，保存在目录: {output_dir}")

    finally:
        client.close()

if __name__ == "__main__":
    main()
