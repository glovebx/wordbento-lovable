import React, { useState, useEffect } from 'react'; // Import useEffect
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Assuming useAuth is correctly imported

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // New state for registration fields
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { login, register } = useAuth(); // Assuming useAuth provides a register function
  const { toast } = useToast();

  // State to track if the registration form is valid
  const [isRegistrationValid, setIsRegistrationValid] = useState(false);

  // Effect to reset registration fields when switching to login mode
  useEffect(() => {
    if (isLogin) {
      setEmail('');
      setConfirmPassword('');
      // You might also want to clear username/password here if you want a clean slate
      // setUsername('');
      // setPassword('');
    }
  }, [isLogin]);

  // Effect to validate registration form whenever relevant fields change
  useEffect(() => {
    if (!isLogin) {
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmailValid = emailRegex.test(email);

      // Check if all registration fields are filled and passwords match
      const isValid = username.trim() !== '' &&
                        email.trim() !== '' &&
                        isEmailValid &&
                        password.trim() !== '' &&
                        confirmPassword.trim() !== '' &&
                        password === confirmPassword;

      setIsRegistrationValid(isValid);
    }
  }, [isLogin, username, email, password, confirmPassword]); // Dependencies for validation effect


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation for both login and registration
    if (username.trim() === '' || password.trim() === '') {
         toast({
             title: "输入错误",
             description: "用户名和密码不能为空。",
             variant: "destructive",
         });
         return;
    }

    if (isLogin) {
      // Login logic
      const success = await login(username, password);
      if (success) {
        toast({
          title: "登录成功",
          description: `欢迎回来，${username}！`,
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: "登录失败",
          description: "用户名或密码错误",
          variant: "destructive",
        });
      }
    } else {
      // Registration logic
      // Perform client-side validation again just before submission (redundant but safe)
      if (!isRegistrationValid) {
           toast({
               title: "注册信息无效",
               description: "请检查您的输入，确保所有字段正确填写且密码一致。",
               variant: "destructive",
           });
           return;
      }

      // Assuming your useAuth hook has a register function that takes username, email, password
      // You will need to implement the actual registration API call in your useAuth hook
      const success = await register(username, email, password); // Call the register function

      if (success) {
        toast({
          title: "注册成功",
          description: `欢迎，${username}！`,
        });
        onSuccess?.();
        onClose();
      } else {
        // Handle registration failure (e.g., username/email already exists, weak password)
        // The register function in useAuth should return false or throw an error on failure
        toast({
          title: "注册失败",
          description: "注册失败，请稍后再试或尝试不同的用户名/邮箱。",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isLogin ? '登录' : '注册'}</DialogTitle>
          <DialogDescription>
            {isLogin
              ? '登录您的账户以收藏单词和进度跟踪'
              : '创建一个新账户以开始您的学习之旅'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入您的用户名"
              required
            />
          </div>

          {/* Conditionally render email and confirm password fields */}
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email" // Use type="email" for basic browser validation
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入您的邮箱"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-confirm">确认密码</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入您的密码"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入您的密码"
              required
            />
          </div>


          <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '切换到注册' : '切换到登录'}
            </Button>
            <Button
                type="submit"
                // Disable the button based on validation state in registration mode
                disabled={!isLogin && !isRegistrationValid}
            >
              {isLogin ? '登录' : '注册'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
