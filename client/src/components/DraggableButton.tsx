import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DraggableButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  storageKey: string; 
  initialPosition: { x: number; y: number };
}

const DraggableButton: React.FC<DraggableButtonProps> = ({ 
  children, 
  className, 
  storageKey, 
  initialPosition, 
  ...props 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragInfoRef = useRef({ startX: 0, startY: 0, didDrag: false });

  // Lazy initializer for useState: reads from localStorage synchronously on first render.
  const [position, setPosition] = useState(() => {
    try {
      const savedPosition = localStorage.getItem(storageKey);
      return savedPosition ? JSON.parse(savedPosition) : initialPosition;
    } catch (error) {
      console.error("Failed to parse saved position from localStorage", error);
      return initialPosition;
    }
  });

  // Save position to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch (error) {
      console.error("Failed to save position to localStorage", error);
    }
  }, [position, storageKey]);

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    
    dragInfoRef.current = { startX: touch.clientX, startY: touch.clientY, didDrag: false };
    setIsDragging(true);
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isDragging) return;

    const touch = e.touches[0];

    const deltaX = Math.abs(touch.clientX - dragInfoRef.current.startX);
    const deltaY = Math.abs(touch.clientY - dragInfoRef.current.startY);

    if (deltaX > 5 || deltaY > 5) {
        dragInfoRef.current.didDrag = true;
    }

    let newX = touch.clientX - offsetRef.current.x;
    let newY = touch.clientY - offsetRef.current.y;

    // Constrain movement within the viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const buttonWidth = buttonRef.current?.offsetWidth || 56; // 56px is a fallback
    const buttonHeight = buttonRef.current?.offsetHeight || 56;

    newX = Math.max(0, Math.min(newX, vw - buttonWidth));
    newY = Math.max(0, Math.min(newY, vh - buttonHeight));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (dragInfoRef.current.didDrag) {
        if (e.cancelable) {
            e.preventDefault();
        }
    }
    setIsDragging(false);
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        'fixed z-50 p-3 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200',
        isDragging && 'scale-110 shadow-xl',
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props} // This passes the onClick handler
    >
      {children}
    </button>
  );
};

export default DraggableButton;
