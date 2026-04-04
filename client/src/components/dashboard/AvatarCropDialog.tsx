import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onSave: (croppedImage: string) => void;
}

const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({ open, onOpenChange, imageSrc, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      setScale(1);
      setOffset({ x: 0, y: 0 });
      drawCanvas();
    };
  }, [imageSrc]);

  useEffect(() => {
    drawCanvas();
  }, [scale, offset]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = 300;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const imgWidth = img.width;
    const imgHeight = img.height;
    
    // Fit image to canvas while maintaining aspect ratio
    const ratio = Math.max(canvasSize / imgWidth, canvasSize / imgHeight);
    const initialWidth = imgWidth * ratio;
    const initialHeight = imgHeight * ratio;

    const drawWidth = initialWidth * scale;
    const drawHeight = initialHeight * scale;

    let dx = (canvasSize - drawWidth) / 2 + offset.x;
    let dy = (canvasSize - drawHeight) / 2 + offset.y;

    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg');
    onSave(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crop your new avatar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <canvas
            ref={canvasRef}
            className="cursor-move border rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // Stop dragging if mouse leaves canvas
            onMouseMove={handleMouseMove}
          />
          <div className="w-full max-w-xs space-y-2">
            <label htmlFor="scale-slider">Zoom</label>
            <Slider
              id="scale-slider"
              min={1}
              max={3}
              step={0.01}
              value={[scale]}
              onValueChange={([val]) => setScale(val)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropDialog;
