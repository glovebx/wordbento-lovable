
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import ThemeToggle from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { User, Grid, BookOpen, Download, Share } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// Import the useNavigate hook from react-router-dom
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  viewMode: 'grid' | 'flashcard';
  onViewModeChange: (mode: 'grid' | 'flashcard') => void;  
}

const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange  
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { 
    promptInstall, 
    showInstallButton,
    showIOSTutorial, 
    setShowIOSTutorial 
  } = usePwaInstall();

  // Get the navigate function from react-router-dom
  const navigate = useNavigate();
  // Handler for clicking "我的收藏"
  const handleNavigateToDashboard = () => {
    navigate('/dashboard'); // Navigate to the /profile route
  };
  // // Handler for clicking "我的收藏"
  // const handleNavigateToAnalysisHistory = () => {
  //   navigate('/history'); // Navigate to the /profile route
  // };  

  const handleToggle = (checked: boolean) => {
    onViewModeChange(checked ? 'flashcard' : 'grid');
  };

  return (
    <header className="sticky top-0 z-10 bg-background border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold">4s背单词</div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">网格模式</span>
              <Switch 
                checked={viewMode === 'flashcard'}
                onCheckedChange={handleToggle}
              />
              <span className="text-sm hidden sm:inline">卡片模式</span>
              <BookOpen className="h-4 w-4" />
            </div>

            <ThemeToggle />
            
            {showInstallButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={promptInstall}
                className="hidden sm:inline-flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                <span>安装应用</span>
              </Button>
            )}

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleNavigateToDashboard}>个人中心</DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={handleNavigateToAnalysisHistory}>解析历史</DropdownMenuItem> */}
                  {/* <DropdownMenuItem>学习记录</DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>退出登录</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAuthModal(true)}>
                <User className="h-4 w-4 mr-2" />
                <span>登录</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <Dialog open={showIOSTutorial} onOpenChange={setShowIOSTutorial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>在 iOS 上安装应用</DialogTitle>
            <DialogDescription className="pt-4">
              <div className="space-y-4 text-left">
                <p>1. 在 Safari 浏览器中打开此网站。</p>
                <p>2. 点击屏幕底部的“分享” <Share className="h-4 w-4 inline-block mx-1" /> 图标。</p>
                <p>3. 在分享菜单中，向上滑动并选择“添加到主屏幕”。</p>
                <p>4. 点击“添加”即可完成。</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;