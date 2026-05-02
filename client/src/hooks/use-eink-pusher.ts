import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseEinkPusherProps {
  einkEndpoint: string | null | undefined;
  einkToken: string | null | undefined;
}

export const useEinkPusher = ({ einkEndpoint, einkToken }: UseEinkPusherProps) => {
  const [isPushing, setIsPushing] = useState(false);
  const { toast } = useToast();

  const pushImage = async (imageUrl: string | null | undefined) => {
    if (!einkEndpoint || !imageUrl) {
      toast({
        title: "推送失败",
        description: "没有可用的图片或 e-ink 阅读器未配置。",
        variant: "destructive",
      });
      return;
    }

    setIsPushing(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.statusText}`);
      }
      const imageBlob = await response.blob();

      const formData = new FormData();
      formData.append('file', imageBlob, 'pushed-image.jpg');

      const pushResponse = await fetch(`${einkEndpoint}/api/v1/push`, {
        method: 'POST',
        headers: {
          'X-API-Token': einkToken || '',
        },
        body: formData,
      });

      if (!pushResponse.ok) {
        const errorBody = await pushResponse.text();
        throw new Error(`HTTP 错误! 状态: ${pushResponse.status}, 响应: ${errorBody}`);
      }

      // 等待10秒，e-ink刷新需要时间
      await new Promise(r => setTimeout(r, 10000));

      toast({
        title: "推送成功",
        description: "图片已发送到您的 e-ink 设备。",
      });

    } catch (error) {
      console.error("推送到 e-ink 失败:", error);
      toast({
        title: "推送失败",
        description: `无法发送图片: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      });
    } finally {
      setIsPushing(false);
    }
  };

  return { isPushing, pushImage };
};