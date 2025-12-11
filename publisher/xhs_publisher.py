import os
from pathlib import PurePath
import traceback
import time

from selenium.webdriver import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait


def xhs_publisher(driver, contents: dict):
    # Get all window handles
    all_handles = driver.window_handles

    # Find the index of the target tab
    exists_tab_found = False
    for i, handle in enumerate(all_handles):
      driver.switch_to.window(handle)
      if '小红书' in driver.title:
        exists_tab_found = True
        driver.switch_to.window(handle) 
        break
    if not exists_tab_found:
        # 打开新标签页并切换到新标签页
        driver.switch_to.new_window('tab')

    title_text = contents['title']
    description_text = contents['description']
    images = contents['images']
    tags = contents['tags']

    # 浏览器实例现在可以被重用，进行你的自动化操作
    # driver.get("https://creator.xiaohongshu.com/publish/publish?source=official")
    driver.get("https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image")
    time.sleep(2)  # 等待2秒

    # 设置等待
    wait = WebDriverWait(driver, 10)

    # 上传图片按钮
    file_input = driver.find_element(By.CLASS_NAME, 'upload-input')
    file_input.send_keys(images[0])
    time.sleep(10)  # 等待
    # 等待图片上传完毕
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.img-preview-area .entry')))

    # 此时会跳转到新页面，继续上传剩余的图片
    file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
    for img in images[1:]:
       file_input.send_keys(img)
       time.sleep(10)  # 等待
       
    title = driver.find_element(By.XPATH, '//input[@class="d-text"]')
    title.send_keys(title_text)
    time.sleep(2)

    # 设置内容
    # content = driver.find_element(By.ID, 'post-textarea')
    editor = driver.find_element(By.CSS_SELECTOR, "div.tiptap.ProseMirror")
    # 确保编辑器获得焦点
    driver.execute_script("arguments[0].focus();", editor)

    lines = description_text.split('\n')    
    for i, line in enumerate(lines):
        if i > 0:  # 从第二行开始需要换行
            # 模拟回车键换行
            editor.send_keys(Keys.ENTER)
            time.sleep(1)
        
        # 输入当前行内容
        editor.send_keys(line)
        time.sleep(1)

    editor.send_keys(Keys.ENTER)    
    # print("逐行输入完成！")
    # 使用键盘快捷键移动到文档末尾
    editor.send_keys(Keys.CONTROL + Keys.END)

    # 3. 在光标位于末尾后，添加一个空格（如果需要）
    # 使用Selenium发送空格键。此时光标已在末尾，此操作是可靠的。
    editor.send_keys(Keys.SPACE)

    time.sleep(2)

    # # 设置tags
    for tag in tags:
        editor.send_keys('#' + tag)
        time.sleep(2)
        editor.send_keys(Keys.ENTER)
        time.sleep(1)
        editor.send_keys(Keys.SPACE)
        time.sleep(2)

    auto_publish = contents.get('auto_publish')
    if auto_publish:
        print("auto publish")
        # 发布
        publish_button = driver.find_element(By.XPATH, '//button[contains(@class, "publishBtn")]')
        publish_button.click()