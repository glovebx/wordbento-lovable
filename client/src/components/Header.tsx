
import React, { useState } from 'react';
import { Search, ArrowLeft, ArrowRight, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

// Import the useNavigate hook from react-router-dom
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onSearch: (word: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  currentWord: string;
  disableNav: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  onPrevious,
  onNext,
  currentWord,
  disableNav
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  // Get the navigate function from react-router-dom
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  // Handler for clicking "我的收藏"
  const handleNavigateToProfile = () => {
    navigate('/profile'); // Navigate to the /profile route
  };

  return (
    <header className="sticky top-0 z-10 bg-background border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              disabled={disableNav}
              variant="outline" 
              size="icon" 
              onClick={onPrevious}
              title="上一个单词"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                disabled={disableNav}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`当前: ${currentWord} | 搜索单词...`}
                className="w-full sm:w-[250px] pl-9"
              />
            </form>
            
            <Button 
              disabled={disableNav}
              variant="outline" 
              size="icon" 
              onClick={onNext}
              title="下一个单词"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleNavigateToProfile}>个人中心</DropdownMenuItem>
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
    </header>
  );
};

export default Header;