import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const [jumpPage, setJumpPage] = useState('');

  if (totalPages <= 1) {
    return null; // Don't render pagination if there's only one page
  }

  const handleJump = () => {
    const pageNumber = parseInt(jumpPage, 10);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
      setJumpPage(''); // 清空输入框
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 只允许输入数字
    if (value === '' || /^\d+$/.test(value)) {
      setJumpPage(value);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 py-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
      {/* 主导航区域 */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
        >
          首页
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          第 {currentPage} 页 / 共 {totalPages} 页
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
        >
          末页
        </Button>
      </div>

      {/* 页码跳转区域 - 在小屏幕上单独一行 */}
      <div className="flex items-center justify-center space-x-2">
        {/* <span className="text-xs text-muted-foreground whitespace-nowrap">跳转到</span> */}
        <Input
          type="text"
          value={jumpPage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="页码"
          className="w-14 h-8 text-sm text-center"
          min="1"
          max={totalPages}
          aria-label="跳转页码"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleJump}
          disabled={!jumpPage || parseInt(jumpPage) < 1 || parseInt(jumpPage) > totalPages}
          className="gap-1"
          aria-label="跳转到指定页"
        >
          <span className="whitespace-nowrap">跳转</span>
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};