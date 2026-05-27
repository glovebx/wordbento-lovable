import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WelcomeNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  qrCodeUrl: string;
}

export const WelcomeNotification: React.FC<WelcomeNotificationProps> = ({
  isOpen,
  onClose,
  title,
  message,
  qrCodeUrl,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center p-4">
          <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border rounded-lg" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose}>
              关闭
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
