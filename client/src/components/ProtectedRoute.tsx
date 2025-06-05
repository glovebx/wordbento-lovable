import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const location = useLocation();
  const { isAuthenticated, isSessionLoading, refreshSession } = useAuth();

  // 当路由变化时刷新会话
  useEffect(() => {
    console.log("ProtectedRoute: Route changed to", location.pathname);
    refreshSession();
  }, [location.pathname, refreshSession]); // 依赖路由路径变化
    
  // Log to see what ProtectedRoute sees
  console.log('ProtectedRoute: Rendered. isAuthenticated:', isAuthenticated, 'isSessionLoading:', isSessionLoading);

  if (isSessionLoading) {
    // 如果会话仍在加载中，显示一个加载指示器
    console.log('ProtectedRoute: Session is loading, showing loading indicator.');
    return (
      <div className="flex justify-center items-center min-h-svh">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <span className="ml-4 text-lg text-gray-600">正在加载认证状态...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 如果会话已加载完成但用户未认证，重定向到首页
    console.log('ProtectedRoute: Not authenticated and session loaded, redirecting to /');
    return <Navigate to="/" replace />; // 使用 replace 避免在历史记录中留下重定向前的页面
  }

  // 如果已认证且加载完成，渲染子组件
  console.log('ProtectedRoute: Authenticated and loaded, rendering children.');
  return <>{children}</>;
};

export default ProtectedRoute;