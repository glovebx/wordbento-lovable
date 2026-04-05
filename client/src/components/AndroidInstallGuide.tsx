import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AndroidInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AndroidInstallGuide: React.FC<AndroidInstallGuideProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>添加到主屏幕</DialogTitle>
          <DialogDescription>
            按照以下步骤将此应用添加到您的主屏幕，以便快速访问。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              点击浏览器菜单按钮 (通常是 <span className="font-bold">⋮</span> 或 <span className="font-bold">...</span>)。
            </li>
            <li>
              在菜单中找到并点击 <span className="font-bold">“添加到主屏幕”</span> 或 <span className="font-bold">“添加到桌面”</span> 选项。
            </li>
            <li>
              确认名称并点击“添加”，应用图标便会出现在您的手机桌面上。
            </li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AndroidInstallGuide;