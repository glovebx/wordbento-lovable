import requests
import json
import time
import os
from typing import Dict, List, Optional
from urllib.parse import urlparse


def download_images_and_save_paths(words, save_base_dir="downloaded_images"):
    """
    下载单词对应的图片并返回本地文件路径列表
    
    参数:
    - words: 单词列表，每个单词应包含imageUrls字段
    - save_base_dir: 图片保存的基础目录
    
    返回:
    - local_image_paths: 所有下载图片的本地完整路径列表
    """
    
    # 创建保存目录
    os.makedirs(save_base_dir, exist_ok=True)
    local_image_paths = []
    
    total_words = len(words)
    
    for i, word in enumerate(words, 1):
        word_text = word.get('word_text', '未知单词')
        word_slug = word.get('word', word_text)
        image_urls = word.get('imageUrls', [])
        
        print(f"[{i}/{total_words}] 处理单词: {word_text}")
        
        # 检查imageUrls是否为空
        if not image_urls:
            print(f"警告: 单词 '{word_text}' 没有包含图片，跳过处理")
            continue
        
        # 为每个单词创建单独的子目录
        word_dir = os.path.join(save_base_dir, word_slug)
        os.makedirs(word_dir, exist_ok=True)
        
        # 下载该单词的所有图片
        word_image_paths = download_single_word_images(image_urls, word_dir, word_text, i)
        local_image_paths.extend(word_image_paths)
    
    print(f"\n下载完成! 总共保存了 {len(local_image_paths)} 张图片")
    print(f"图片保存目录: {os.path.abspath(save_base_dir)}")
    
    return local_image_paths

def download_single_word_images(image_urls, save_dir, word_text, word_index):
    """
    下载单个单词的所有图片[7](@ref)
    
    返回:
    - 当前单词所有图片的本地路径列表
    """
    word_image_paths = []
    
    for j, image_url in enumerate(image_urls, 1):
        try:
            # 生成唯一文件名
            file_extension = get_file_extension(image_url)
            filename = f"{word_text}_{word_index}_{j}{file_extension}"
            file_path = os.path.join(save_dir, filename)
            
            # 下载并保存图片[1,2](@ref)
            success = download_image(image_url, file_path)
            
            if success:
                # 将路径转换为绝对路径
                absolute_file_path = os.path.abspath(file_path)
                word_image_paths.append(absolute_file_path)

                print(f"  图片 {j}/{len(image_urls)} 保存成功: {file_path}")
            else:
                print(f"  图片 {j}/{len(image_urls)} 下载失败")
                
        except Exception as e:
            print(f"  处理图片 {j} 时出错: {str(e)}")
    
    return word_image_paths

def download_image(image_url, file_path):
    """
    下载单张图片到本地[3,7](@ref)
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        response = requests.get(image_url, headers=headers, stream=True, timeout=30)
        response.raise_for_status()
        
        # 确保目录存在
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # 保存图片[5](@ref)
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        return True
        
    except Exception as e:
        print(f"下载失败: {str(e)}")
        return False

def get_file_extension(url):
    """
    从URL中获取文件扩展名[7](@ref)
    """
    parsed = urlparse(url)
    path = parsed.path.lower()
    
    # 常见图片格式
    if path.endswith(('.jpg', '.jpeg')):
        return '.jpg'
    elif path.endswith('.png'):
        return '.png'
    elif path.endswith('.gif'):
        return '.gif'
    elif path.endswith('.webp'):
        return '.webp'
    elif path.endswith('.bmp'):
        return '.bmp'
    else:
        # 如果无法从URL判断，默认使用jpg
        return '.jpg'
    
class WordBentoClient:
    def __init__(self, base_url: str, auth_key: str, state_file: str = "word_state.json"):
        """
        初始化WordBento客户端
        
        Args:
            base_url: 接口基础URL
            auth_key: 认证密钥
            state_file: 状态存储文件路径
        """
        self.base_url = base_url.rstrip('/')
        self.auth_key = auth_key
        self.state_file = state_file
        self.session = requests.Session()
        self.timeout = 360
        
        # 设置公共请求头
        self.headers = {
            'Authorization': f'Wordbento-Auth-Key {auth_key}',
            'Accept': 'application/json',
            'Accept-Charset': 'UTF-8',
            'Content-Type': 'application/json'
        }

    def load_state(self) -> int:
        """
        从JSON文件加载上次的latestViewsId
        
        Returns:
            int: 上次的latestViewsId，如果文件不存在返回0
        """
        try:
            if os.path.exists(self.state_file):
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                    return state.get('latestViewsId', 0)
            return 0
        except Exception as e:
            print(f"加载状态文件失败: {e}，使用默认值0")
            return 0

    def save_state(self, latest_views_id: int) -> None:
        """
        保存latestViewsId到JSON文件
        
        Args:
            latest_views_id: 最新的视图ID
        """
        try:
            state = {'latestViewsId': latest_views_id}
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, ensure_ascii=False)
            print(f"状态已保存: latestViewsId = {latest_views_id}")
        except Exception as e:
            print(f"保存状态文件失败: {e}")

    def get_today_words(self, max_id: int) -> Optional[Dict]:
        """
        获取今日单词列表
        
        Args:
            max_id: 最大ID参数
            
        Returns:
            Dict: 接口响应数据，失败返回None
        """
        url = f"{self.base_url}/api/word/today"
        payload = {"maxId": max_id}
        
        try:
            response = self.session.post(url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()  # 检查HTTP错误状态
            
            data = response.json()
            print(f"成功获取单词数据，本次获取 {len(data.get('data', []))} 个单词")
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"请求今日单词接口失败: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"解析响应JSON失败: {e}")
            return None

    def generate_word_image(self, word_slug: str) -> bool:
        """
        为单词生成图片
        
        Args:
            word_slug: 单词的slug标识
            
        Returns:
            bool: 是否成功
        """
        url = f"{self.base_url}/api/word/imagize"
        payload = {"slug": word_slug}
        
        try:
            response = self.session.post(url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            
            print(f"成功为单词 '{word_slug}' 生成图片")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"为单词 '{word_slug}' 生成图片失败: {e}")
            return False

    def process_today_words(self) -> None:
        """
        主处理流程：获取单词并处理图片生成
        """
        # 1. 加载上次的latestViewsId
        max_id = self.load_state()
        print(f"开始处理，使用maxId: {max_id}")
        
        # 2. 获取今日单词数据
        word_data = self.get_today_words(max_id)
        if not word_data:
            print("获取单词数据失败，程序退出")
            return
            
        # 3. 保存最新的latestViewsId
        latest_views_id = word_data.get('latestViewsId', max_id)
        self.save_state(latest_views_id)
        
        # 4. 处理每个单词
        words = word_data.get('data', [])
        total_words = len(words)
        
        if total_words == 0:
            print("没有需要处理的单词")
            return
            
        print(f"开始处理 {total_words} 个单词...")
        
        processed_count = 0
        need_image_count = 0
        
        for i, word in enumerate(words, 1):
            word_text = word.get('word_text', '未知单词')
            word_slug = word.get('word', word_text)  # 使用word字段作为slug，备用word_text
            image_urls = word.get('imageUrls', [])
            
            print(f"[{i}/{total_words}] 处理单词: {word_text}")
            
            # 检查imageUrls是否为空
            # 或者所有地址都是文生图平台的地址
            if not image_urls or all(url.startswith('https://p') for url in image_urls):
                if image_urls:
                    print(image_urls)
                need_image_count += 1
                print(f"  单词 '{word_text}' 需要生成图片...")
                
                # 调用图片生成接口
                success = self.generate_word_image(word_slug)
                
                if success:
                    processed_count += 1
                
                # 无论成功与否，等待5秒
                print("  等待5秒...")
                time.sleep(5)
            else:
                print(f"  单词 '{word_text}' 已有图片，跳过")
        
        # 输出处理摘要
        print(f"\n处理完成摘要:")
        print(f"  总单词数: {total_words}")
        print(f"  需要生成图片的单词: {need_image_count}")
        print(f"  成功生成图片的单词: {processed_count}")
        print(f"  最新latestViewsId: {latest_views_id}")

    def get_sequence_words(self, max_id: int) -> Optional[Dict]:
        """
        获取要发布的单词列表
        
        Args:
            max_id: 最大ID参数
            
        Returns:
            Dict: 接口响应数据，失败返回None
        """
        url = f"{self.base_url}/api/word/sequence"
        payload = {"maxId": max_id}
        
        try:
            response = self.session.post(url, headers=self.headers, json=payload, timeout=self.timeout)
            response.raise_for_status()  # 检查HTTP错误状态
            
            data = response.json()
            print(f"成功获取单词数据，本次获取 {len(data.get('data', []))} 个单词")
            return data
            
        except requests.exceptions.RequestException as e:
            print(f"请求今日单词接口失败: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"解析响应JSON失败: {e}")
            return None

    def process_sequence_words(self) -> None:
        """
        主处理流程：获取单词并处理图片生成
        """
        # 1. 加载上次的 latestViewsId
        max_id = self.load_state()
        print(f"开始处理，使用maxId: {max_id}")
        
        # 2. 获取今日单词数据
        word_data = self.get_sequence_words(max_id)
        if not word_data:
            print("获取单词数据失败，程序退出")
            return
            
        # 3. 保存最新的 latestWordId
        latest_views_id = word_data.get('latestWordId', max_id)
        self.save_state(latest_views_id)
        
        # 4. 处理每个单词（注意，因为是发布，每次仅获取一个单词）
        words = word_data.get('data', [])
        total_words = len(words)
        
        if total_words == 0:
            print("没有需要处理的单词")
            return
            
        print(f"开始处理 {total_words} 个单词...")
        
        save_base_dir = "downloaded_images"
        # 创建保存目录
        os.makedirs(save_base_dir, exist_ok=True)        
        
        contents = {}
        local_image_paths = []
        for i, word in enumerate(words, 1):
            word_text = word.get('word_text', '未知单词')
            word_slug = word.get('word', word_text)  # 使用word字段作为slug，备用word_text
            image_urls = word.get('imageUrls', [])
            description = word.get('text', word_text);
            
            print(f"[{i}/{total_words}] 处理单词: {word_text}")
            
            # 检查imageUrls是否为空
            if not image_urls:
                raise ValueError('该单词没有包含图片，请重试！')
        
            # 下载该单词的所有图片
            word_image_paths = download_single_word_images(image_urls, save_base_dir, word_text, i)
            local_image_paths.extend(word_image_paths)

            contents = {
                'title': f"单词打卡: {word_slug}",
                'description': description,
                'images': local_image_paths,
                'tags': ['单词打卡', '每日单词', '英语学习', '英语单词速记', '英语词汇', '单词记忆法', '日常英语']
            }

        # 输出处理摘要
        print(f"\n处理完成摘要:")
        print(f"  单词内容: {contents}")
        print(f"  最新latestViewsId: {latest_views_id}")

        return contents

    def close(self):
        """关闭会话"""
        self.session.close()