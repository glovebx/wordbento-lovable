
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingFallback from "@/components/LoadingFallback";

const ProtectedRoute = () => {
  const { isAuthenticated, isSessionLoading } = useAuth();

// useEffect(() => {
//   console.log("ProtectedRoute 挂载了");
//   return () => console.log("ProtectedRoute 卸载了！检测到非法页面刷新或路由销毁");
// }, []);

  // console.log('ProtectedRoute render:', { 
  //   isAuthenticated, 
  //   isSessionLoading, 
  //   userExists: !!user,
  //   userData: user 
  // });

  if (isSessionLoading) {
    return <LoadingFallback message="Authenticating..." />;
  }
  if (!isAuthenticated) {
    // console.log('Not authenticated, redirecting from:', location.pathname);
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
