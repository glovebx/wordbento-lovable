import os
from pathlib import Path
import time
import traceback

import selenium
from selenium import webdriver

from xhs_publisher import xhs_publisher
from word_bento_client import WordBentoClient

all_sites = ['xhs',]

# 调试模式启动firefox
#  ./firefox -marionette -start-debugger-server 2828
def init_driver():
    driver_path = Path(__file__).parent.parent.joinpath('publisher/geckodriver').as_posix()
    print(driver_path)
    # 启动浏览器驱动服务
    service = selenium.webdriver.firefox.service.Service(driver_path,
                                                         service_args=['--marionette-port', '2828',
                                                                       '--connect-existing'])
    # 创建firefox选项，重用现有的浏览器实例
    options = selenium.webdriver.firefox.options.Options()
    options.page_load_strategy = 'normal'  # 设置页面加载策略为'normal' 默认值, 等待所有资源下载,
    driver = webdriver.Firefox(service=service, options=options)
    driver.implicitly_wait(10)  # 设置隐式等待时间为15秒
    return driver
    
def publish_to_platform(platform: str, contents: dict):
    """
    发布到指定平台的封装函数
    """
    driver = init_driver()

    try:
        if platform in all_sites:
            globals()[platform + '_publisher'](driver, contents)  # 动态调用对应平台的发布函数
        else:
            for site in all_sites:
                globals()[site + '_publisher'](driver, contents)  # 全部发布
                time.sleep(5)
    except Exception as e:
        print(platform, "got error")
        traceback.print_exc()  # 打印完整的异常跟踪信息
        print(e)

def main():
    """
    主函数 - 配置参数并运行客户端
    """
    # 配置参数
    BASE_URL = "http://192.168.3.58:8787"
    AUTH_KEY = "fa2357b2-4fbe-4a42-8901-300571fc6cfa"
    STATE_FILE = "sequence_word_state.json"  # 状态存储文件
    
    # 创建客户端实例
    client = WordBentoClient(BASE_URL, AUTH_KEY, STATE_FILE)
    
    try:
        # 执行处理流程
        contents = client.process_sequence_words()
        if contents:
            publish_to_platform('xhs', contents)
        else:
            print("没有获取到单词内容！！")
    except KeyboardInterrupt:
        print("\n程序被用户中断")
    except Exception as e:
        print(f"程序执行异常: {e}")
    finally:
        # 确保资源被正确释放
        client.close()
        print("程序执行完毕")

if __name__ == '__main__':
    # contents = {
    #     'title': '单词打卡：dispersal',
    #     'description': "The act or process of spreading things or people over a wide area, or of becoming spread in this way. Often used in contexts of biology (seed/pollen dispersal), ecology (population dispersal), or social phenomena (information/crowd dispersal).\n词根：'spers-'（源自拉丁语 'spargere'，意为散开）。前缀：'dis-'（分开，远离，具有反转力）。后缀：'-al'（构成表示动作的名词）。相关词汇：disperse（动词），dispersion（名词），dispersive（形容词）。",
    #     'images': ['/Users/glovebx/Downloads/QvWtzEkG1X.png'],
    #     'tags': ['单词打卡', '每日单词', '英语学习', '英语单词速记', '英语词汇', '单词记忆法', '日常英语']
    # }
    # publish_to_platform('xhs', contents)
    main()