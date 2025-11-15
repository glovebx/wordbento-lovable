import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Copy } from "lucide-react"; // 添加Copy图标
import { useState } from "react"; // 引入useState用于确认对话框状态

interface AccessTokenSettingsProps {
  accessToken?: string;
  onTokenRefresh: () => Promise<void>;
  isSaving: boolean;
}

export const AccessTokenSettings = ({
  accessToken,
  onTokenRefresh,
  isSaving,
}: AccessTokenSettingsProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  const handleCopyToClipboard = async () => {
    if (!accessToken) return;

    // 方案1: 尝试使用现代的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(accessToken);
        console.log('复制成功!');
        setCopyStatus("success");
        // 2秒后重置状态
        setTimeout(() => setCopyStatus("idle"), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API 复制失败: ', err);
        // 现代 API 失败，继续尝试降级方案
      }
    }

    // 方案2: 降级使用 document.execCommand
    try {
      // 创建一个临时的 textarea 元素
      const textArea = document.createElement('textarea');
      textArea.value = accessToken;
      // 将元素移到视窗外并使其不可见
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      
      textArea.focus(); // 对于 iOS 设备可能需要
      textArea.select(); // 选择文本

      // 执行复制命令
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea); // 清理DOM

      if (successful) {
        console.log('复制成功 (降级方案)!');
        setCopyStatus("success");
        // 2秒后重置状态
        setTimeout(() => setCopyStatus("idle"), 2000);      
      } else {
        throw new Error('execCommand 复制失败');
      }
    } catch (err) {
      console.error('所有复制方案均失败: ', err);
      // 最终备选方案：提示用户手动复制
      alert(`自动复制失败，请您手动选择并复制以下内容：\n\n${accessToken}`);
    }
  };

  // 处理刷新点击 - 显示确认对话框
  const handleRefreshClick = () => {
    setShowConfirmation(true);
  };

  // 确认刷新
  const handleConfirmRefresh = async () => {
    setShowConfirmation(false);
    if (!isSaving) {
      await onTokenRefresh();
    }
  };

  // 取消刷新
  const handleCancelRefresh = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Access Token Settings</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor='access_token'>Access Token</Label>
          <div className="relative">
            <Input
              id='access_token'
              value={accessToken}
              readOnly
              disabled={isSaving}
              className="pr-12" // 为拷贝按钮留出空间
            />
            {/* 拷贝图标按钮 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={handleCopyToClipboard}
              disabled={!accessToken || isSaving}
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            {/* 拷贝状态提示 */}
            {copyStatus === "success" && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                已拷贝!
              </div>
            )}
            {copyStatus === "error" && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                拷贝失败!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleRefreshClick}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            '刷新令牌'
          )}
        </Button>
      </div>

      {/* 确认对话框 */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">确认</h3>
            <p className="text-gray-600 mb-6">
              确认要刷新访问令牌吗？这将生成新令牌，旧令牌立即失效。
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleCancelRefresh}
                disabled={isSaving}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmRefresh}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  '刷新'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};