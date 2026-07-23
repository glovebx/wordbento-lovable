import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { WordDataType } from '@/types/wordTypes';
import { baseURL } from '@/lib/axios';
import {
  X,
  MousePointer2,
  Minus,
  Circle,
  Square,
  Triangle,
  Trash2,
  Save,
  Droplets,
  Pen,
  Loader2
} from 'lucide-react';
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Line,
  Circle as KonvaCircle,
  Rect,
  RegularPolygon,
  Transformer,
} from 'react-konva';
import Konva from 'konva';

type ShapeType = 'select' | 'line' | 'circle' | 'rect' | 'triangle' | 'pen';

interface ShapeData {
  id: string;
  type: Exclude<ShapeType, 'select'>;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  points: number[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

function generateId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultShape(
  type: Exclude<ShapeType, 'select'>,
  pointerX: number,
  pointerY: number,
  fill: string,
  stroke: string,
  strokeWidth: number
): ShapeData {
  const base = {
    id: generateId(),
    type,
    fill,
    stroke,
    strokeWidth,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };

  switch (type) {
    case 'line':
      return { ...base, x: pointerX, y: pointerY, points: [0, 0, 0, 0], width: 0, height: 0, radius: 0 };
    case 'circle':
      return { ...base, x: pointerX, y: pointerY, radius: 1, width: 0, height: 0, points: [] };
    case 'rect':
      return { ...base, x: pointerX, y: pointerY, width: 1, height: 1, radius: 0, points: [] };
    case 'triangle':
      return { ...base, x: pointerX, y: pointerY, radius: 1, width: 0, height: 0, points: [] };
    case 'pen':
      return { ...base, x: 0, y: 0, points: [pointerX, pointerY], width: 0, height: 0, radius: 0, stroke: stroke, fill: 'transparent' };
  }
}

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: WordDataType;
  imageUrl: string;
  imageUrls: string[];
  onSave: (dataUrl: string, url: string, redact: boolean, replace: boolean) => void;
  isSavingImage: boolean;
}

const TOOLS: { key: ShapeType; icon: React.ReactNode; label: string }[] = [
  { key: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: '选择' },
  { key: 'pen', icon: <Pen className="h-4 w-4" />, label: '涂鸦' },
  { key: 'line', icon: <Minus className="h-4 w-4" />, label: '线条' },
  { key: 'circle', icon: <Circle className="h-4 w-4" />, label: '圆形' },
  { key: 'rect', icon: <Square className="h-4 w-4" />, label: '方形' },
  { key: 'triangle', icon: <Triangle className="h-4 w-4" />, label: '三角形' },
];

const STROKE_WIDTHS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

const ImageEditorDialog: React.FC<ImageEditorDialogProps> = ({
  open,
  onOpenChange,
  word,
  imageUrl,
  imageUrls,
  onSave,
  isSavingImage
}) => {
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ShapeType>('select');
  const [currentFill, setCurrentFill] = useState('transparent');
  const [currentStroke, setCurrentStroke] = useState('#ff6b6b');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(8);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  // 新增：所有图片数据
  const [allImages, setAllImages] = useState<{ url: string; element: HTMLImageElement }[]>([]);
  const [thumbnailImages, setThumbnailImages] = useState<{ url: string; element: HTMLImageElement }[]>([]);

  // Pen drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPenPoints, setCurrentPenPoints] = useState<number[]>([]);

  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [drawingShape, setDrawingShape] = useState<ShapeData | null>(null);
  const [drawStartPos, setDrawStartPos] = useState<{ x: number; y: number } | null>(null);

  const [replaceMode, setReplaceMode] = useState(true);
  const [phoneticMode, setPhoneticMode] = useState(true);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const programmaticStyleRef = useRef(false);
  const selectedShapeTypeRef = useRef<ShapeData['type'] | null>(null);

  // 新增：水印去除相关状态
  const [isRemovingWatermark, setIsRemovingWatermark] = useState(false);
  // const [watermarkMask, setWatermarkMask] = useState<ShapeData | null>(null);

  // 加载所有图片
  useEffect(() => {
    if (!open) return;
    
    const loadedImages: { url: string; element: HTMLImageElement }[] = [];
    let loadedCount = 0;
    
    imageUrls.forEach((url) => {
      const imageKey = url.split("/").pop();
      const src = `${baseURL}/api/word/image/${imageKey}`
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        loadedImages.push({ url, element: img });
        loadedCount++;
        
        if (loadedCount === imageUrls.length) {
          setAllImages(loadedImages);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setAllImages(loadedImages);
        }
      };
    });
    
    // 如果只有当前图片，直接设置
    if (imageUrls.length === 1) {
      setAllImages([]);
    }
  }, [open, imageUrls]);

  // 加载缩略图
  useEffect(() => {
    if (!open || allImages.length === 0) return;
    
    const thumbnails: { url: string; element: HTMLImageElement }[] = [];
    let loadedCount = 0;
    
    allImages.forEach(({ url }) => {
      const imageKey = url.split("/").pop();
      const src = `${baseURL}/api/word/image/${imageKey}`      
      const thumbImg = new window.Image();
      thumbImg.crossOrigin = 'anonymous';
      thumbImg.src = src;
      thumbImg.onload = () => {
        thumbnails.push({ url, element: thumbImg });
        loadedCount++;
        
        if (loadedCount === allImages.length) {
          setThumbnailImages(thumbnails);
        }
      };
      thumbImg.onerror = () => {
        loadedCount++;
        if (loadedCount === allImages.length) {
          setThumbnailImages(thumbnails);
        }
      };
    });
  }, [open, allImages]);

  // 切换图片
  const handleImageSwitch = useCallback((url: string) => {
    // 切换到新图片
    setCurrentImageUrl(url);
    
    // 清空当前图片的编辑状态
    setShapes([]);
    setSelectedShapeId(null);
    selectedShapeTypeRef.current = null;
    
    // 更新当前显示的图片
    const imageData = allImages.find(img => img.url === url);
    if (imageData) {
      setImage(imageData.element);
    }
  }, [currentImageUrl, shapes, allImages]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShapes([]);
      setSelectedShapeId(null);
      setCurrentTool('select');
      setIsDrawing(false);
      setCurrentPenPoints([]);
      setIsDrawingShape(false);
      setDrawingShape(null);
      setDrawStartPos(null);
      selectedShapeTypeRef.current = null;
    }
  }, [open]);

  // Load the image
  useEffect(() => {
    if (!imageUrl) return;

    const imageKey = imageUrl.split("/").pop();
    const src = `${baseURL}/api/word/image/${imageKey}`

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, [imageUrl]);

  // Observe container size changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  // Sync the Transformer to the selected shape
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const tr = stage.findOne('#transformer') as Konva.Transformer;
    if (!tr) return;

    if (selectedShapeId) {
      const node = stage.findOne(`#${selectedShapeId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedShapeId, shapes]);

  // When selection changes, sync the toolbar to match the selected shape's style
  useEffect(() => {
    if (!selectedShapeId) {
      selectedShapeTypeRef.current = null;
      return;
    }
    const shape = shapes.find((s) => s.id === selectedShapeId);
    if (shape) {
      programmaticStyleRef.current = true;
      selectedShapeTypeRef.current = shape.type;
      
      // 对于涂鸦和线条，只同步边框相关属性
      if (shape.type === 'pen' || shape.type === 'line') {
        setCurrentStroke(shape.stroke);
        setCurrentStrokeWidth(shape.strokeWidth);
        // 不改变填充颜色设置
      } else {
        setCurrentFill(shape.fill);
        setCurrentStroke(shape.stroke);
        setCurrentStrokeWidth(shape.strokeWidth);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShapeId]);

  // Apply toolbar style changes to the selected shape (user-initiated only)
  useEffect(() => {
    if (programmaticStyleRef.current) {
      programmaticStyleRef.current = false;
      return;
    }
    if (!selectedShapeId) return;
    
    const shapeType = selectedShapeTypeRef.current;
    
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== selectedShapeId) return s;
        
        // 对于涂鸦和线条，只更新边框相关属性，保持填充为透明
        if (shapeType === 'pen' || shapeType === 'line') {
          return { 
            ...s, 
            stroke: currentStroke, 
            strokeWidth: currentStrokeWidth,
            fill: s.type === 'pen' ? 'transparent' : s.fill // 涂鸦强制透明，线条保持原有填充
          };
        }
        
        // 其他形状更新所有样式
        return { 
          ...s, 
          fill: currentFill, 
          stroke: currentStroke, 
          strokeWidth: currentStrokeWidth 
        };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFill, currentStroke, currentStrokeWidth, selectedShapeId]);

  // Calculate the image position/size to fit the stage while maintaining aspect ratio
  const imageAttrs = useMemo(() => {
    if (!image) return null;
    const scale = Math.min(
      stageSize.width / image.width,
      stageSize.height / image.height,
      1 // Don't upscale small images
    );
    return {
      x: (stageSize.width - image.width * scale) / 2,
      y: (stageSize.height - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    };
  }, [image, stageSize]);

  // ─── Event Handlers ──────────────────────────────────────────

  const handleShapeInteraction = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    const id = e.target.id();
    if (id && id !== 'transformer') {
      setSelectedShapeId(id);
    }
  }, []);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (currentTool === 'pen') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      
      setIsDrawing(true);
      setCurrentPenPoints([pos.x, pos.y]);
      return;
    }
    
    // 处理其他形状的拖拽绘制
    if (currentTool !== 'select') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      
      // 只在点击空白区域时开始绘制
      const clickedOnStage = e.target === e.target.getStage();
      if (!clickedOnStage) return;
      
      setIsDrawingShape(true);
      setDrawStartPos({ x: pos.x, y: pos.y });
      
      // 创建初始形状
      const shape = createDefaultShape(
        currentTool,
        pos.x,
        pos.y,
        currentFill,
        currentStroke,
        currentStrokeWidth
      );
      setDrawingShape(shape);
    }
  }, [currentTool, currentFill, currentStroke, currentStrokeWidth]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    // 处理涂鸦
    if (isDrawing && currentTool === 'pen') {
      setCurrentPenPoints(prev => [...prev, pos.x, pos.y]);
      return;
    }
    
    // 处理形状拖拽绘制
    if (isDrawingShape && drawStartPos && drawingShape) {
      const dx = pos.x - drawStartPos.x;
      const dy = pos.y - drawStartPos.y;
      
      setDrawingShape(prev => {
        if (!prev) return prev;
        
        switch (prev.type) {
          case 'line': {
            const centerX = drawStartPos.x;
            const centerY = drawStartPos.y;
            return {
              ...prev,
              x: centerX,
              y: centerY,
              points: [0, 0, dx, dy]
            };
          }
          
          case 'rect': {
            const width = Math.abs(dx);
            const height = Math.abs(dy);
            const x = dx > 0 ? drawStartPos.x : drawStartPos.x + dx;
            const y = dy > 0 ? drawStartPos.y : drawStartPos.y + dy;
            
            return {
              ...prev,
              x,
              y,
              width: Math.max(1, width),
              height: Math.max(1, height)
            };
          }
          
          case 'circle': {
            const radius = Math.sqrt(dx * dx + dy * dy);
            const centerX = drawStartPos.x;
            const centerY = drawStartPos.y;
            
            return {
              ...prev,
              x: centerX,
              y: centerY,
              radius: Math.max(1, radius)
            };
          }
          
          case 'triangle': {
            const radius = Math.sqrt(dx * dx + dy * dy);
            const centerX = drawStartPos.x;
            const centerY = drawStartPos.y;
            
            return {
              ...prev,
              x: centerX,
              y: centerY,
              radius: Math.max(1, radius),
              rotation: Math.atan2(dy, dx) * (180 / Math.PI) + 90
            };
          }
          
          default:
            return prev;
        }
      });
    }
  }, [isDrawing, currentTool, isDrawingShape, drawStartPos, drawingShape]);

  const handleMouseUp = useCallback(() => {
    // 处理涂鸦结束
    if (isDrawing && currentTool === 'pen') {
      setIsDrawing(false);
      
      if (currentPenPoints.length < 4) {
        setCurrentPenPoints([]);
        return;
      }
      
      const shape = createDefaultShape('pen', 0, 0, 'transparent', currentStroke, currentStrokeWidth);
      shape.points = currentPenPoints;
      setShapes(prev => [...prev, shape]);
      setSelectedShapeId(shape.id);
      setCurrentPenPoints([]);
      return;
    }
    
    // 处理形状拖拽绘制结束
    if (isDrawingShape && drawingShape) {
      setIsDrawingShape(false);
      
      // 检查形状是否太小
      const isTooSmall = 
        (drawingShape.type === 'line' && drawingShape.points.length >= 4 && 
         Math.abs(drawingShape.points[2] - drawingShape.points[0]) < 5 && 
         Math.abs(drawingShape.points[3] - drawingShape.points[1]) < 5) ||
        (drawingShape.type === 'rect' && drawingShape.width < 5 && drawingShape.height < 5) ||
        (drawingShape.type === 'circle' && drawingShape.radius < 5) ||
        (drawingShape.type === 'triangle' && drawingShape.radius < 5);
      
      if (isTooSmall) {
        setDrawingShape(null);
        setDrawStartPos(null);
        return;
      }
      
      setShapes(prev => [...prev, drawingShape]);
      setSelectedShapeId(drawingShape.id);
      selectedShapeTypeRef.current = drawingShape.type;
      setDrawingShape(null);
      setDrawStartPos(null);
      setCurrentTool('select');
    }
  }, [isDrawing, currentTool, currentPenPoints, currentStroke, currentStrokeWidth, isDrawingShape, drawingShape]);

  const handleStageInteraction = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (currentTool === 'pen') return; // Pen tool handled separately
      
      const clickedStage = e.target === e.target.getStage();
      
      if (clickedStage) {
        setSelectedShapeId(null);
        selectedShapeTypeRef.current = null;
      }
    },
    [currentTool]
  );

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setShapes((prev) =>
      prev.map((s) => (s.id === node.id() ? { ...s, x: node.x(), y: node.y() } : s))
    );
  }, []);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale on the node immediately to prevent double-application
    node.scaleX(1);
    node.scaleY(1);

    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated: ShapeData = {
          ...s,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        };

        if (s.type === 'rect') {
          updated.width = Math.max(10, s.width * scaleX);
          updated.height = Math.max(10, s.height * scaleY);
        } else if (s.type === 'circle' || s.type === 'triangle') {
          const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          updated.radius = Math.max(5, s.radius * avgScale);
        } else if (s.type === 'line' || s.type === 'pen') {
          // Scale points for lines and pen strokes
          if (s.points.length > 0) {
            updated.points = s.points.map((coord, index) => {
              return index % 2 === 0 ? coord * scaleX : coord * scaleY;
            });
          }
        }

        return updated;
      })
    );
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedShapeId) return;
    setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
    setSelectedShapeId(null);
    selectedShapeTypeRef.current = null;
  }, [selectedShapeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId) {
        e.preventDefault();
        handleDelete();
      }
      if (e.key === 'Escape') {
        setCurrentTool('select');
        setSelectedShapeId(null);
        selectedShapeTypeRef.current = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDelete, selectedShapeId]);

  // Export only the image area as a PNG with original image dimensions
  const handleSave = useCallback(() => {
    if (!stageRef.current || !image || !imageAttrs) return;
    
    // Get the full stage as data URL
    const fullDataUrl = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
    
    // Create an image element to load the full stage screenshot
    const fullImg = new window.Image();
    fullImg.onload = () => {
      // Create a canvas with the original image dimensions
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Calculate the scale between the full stage screenshot and the stage size
      const stageScaleX = fullImg.width / stageSize.width;
      const stageScaleY = fullImg.height / stageSize.height;
      
      // Draw only the image area from the full stage screenshot
      ctx.drawImage(
        fullImg,
        imageAttrs.x * stageScaleX,
        imageAttrs.y * stageScaleY,
        imageAttrs.width * stageScaleX,
        imageAttrs.height * stageScaleY,
        0,
        0,
        image.width,
        image.height
      );
      
      // Get the cropped data URL
      const croppedDataUrl = canvas.toDataURL('image/png');
      onSave(croppedDataUrl, currentImageUrl, phoneticMode, replaceMode);
    };
    
    fullImg.src = fullDataUrl;
  }, [image, imageAttrs, stageSize, currentImageUrl, onSave, replaceMode, phoneticMode]);  

  // Render a single shape
  const renderShape = (shape: ShapeData) => {
    const common = {
      id: shape.id,
      x: shape.x,
      y: shape.y,
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      rotation: shape.rotation,
      scaleX: shape.scaleX,
      scaleY: shape.scaleY,
      draggable: true,
      onClick: handleShapeInteraction,
      onTap: handleShapeInteraction,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
    };

    switch (shape.type) {
      case 'line':
        return <Line key={shape.id} {...common} points={shape.points} lineCap="round" lineJoin="round" tension={0} />;
      case 'circle':
        return <KonvaCircle key={shape.id} {...common} radius={shape.radius} />;
      case 'rect':
        return <Rect key={shape.id} {...common} width={shape.width} height={shape.height} />;
      case 'triangle':
        return <RegularPolygon key={shape.id} {...common} sides={3} radius={shape.radius} />;
      case 'pen':
        return (
          <Line
            key={shape.id}
            {...common}
            points={shape.points}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            fill="transparent"
            globalCompositeOperation="source-over"
          />
        );
      default:
        return null;
    }
  };

const removeWatermark = useCallback(async () => {
    if (!stageRef.current || !image || !imageAttrs) return;
    
    const penShapes = shapes.filter(s => s.type === 'pen');
    if (penShapes.length === 0) return;
    
    setIsRemovingWatermark(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      await new Promise<void>((resolve) => {
        const imageKey = currentImageUrl.split("/").pop();
        const src = `${baseURL}/api/word/image/${imageKey}`

        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // 创建mask
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = img.width;
          maskCanvas.height = img.height;
          const maskCtx = maskCanvas.getContext('2d')!;
          
          const scaleX = img.width / imageAttrs.width;
          const scaleY = img.height / imageAttrs.height;
          
          // 绘制粗线mask
          maskCtx.fillStyle = 'white';
          maskCtx.strokeStyle = 'white';
          maskCtx.lineCap = 'round';
          maskCtx.lineJoin = 'round';
          
          penShapes.forEach(shape => {
            if (shape.points.length < 4) return;
            
            maskCtx.beginPath();
            const points = shape.points;
            for (let i = 0; i < points.length; i += 2) {
              const x = (points[i] - imageAttrs.x) * scaleX;
              const y = (points[i + 1] - imageAttrs.y) * scaleY;
              
              if (i === 0) {
                maskCtx.moveTo(x, y);
              } else {
                maskCtx.lineTo(x, y);
              }
            }
            // 加大线宽
            maskCtx.lineWidth = shape.strokeWidth * Math.max(scaleX, scaleY) + 20;
            maskCtx.stroke();
          });
          
          // 获取mask数据
          const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
          const binaryMask = new Uint8Array(canvas.width * canvas.height);
          for (let i = 0; i < maskData.data.length; i += 4) {
            binaryMask[i / 4] = maskData.data[i] > 128 ? 1 : 0;
          }
          
          // 膨胀mask
          const expandedMask = dilateMaskStrong(binaryMask, canvas.width, canvas.height, 15);
          
          // 执行强力填充
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = aggressiveInpainting(imageData, expandedMask);
          
          ctx.putImageData(result, 0, 0);
          
          const newDataUrl = canvas.toDataURL('image/png');
          const newImg = new window.Image();
          newImg.onload = () => {
            setImage(newImg);
            setShapes(prev => prev.filter(s => s.type !== 'pen'));
            setSelectedShapeId(null);
            selectedShapeTypeRef.current = null;
            setIsRemovingWatermark(false);
          };
          newImg.src = newDataUrl;
          
          resolve();
        };

        img.src = src;
      });
    } catch (error) {
      console.error('Watermark removal failed:', error);
      setIsRemovingWatermark(false);
    }
  }, [image, currentImageUrl, imageAttrs, shapes]);

  // 强力膨胀mask
function dilateMaskStrong(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    const result = new Uint8Array(mask);
    
    for (let r = 0; r < radius; r++) {
      const temp = new Uint8Array(result);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (result[y * width + x] === 1) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                temp[(y + dy) * width + (x + dx)] = 1;
              }
            }
          }
        }
      }
      for (let i = 0; i < temp.length; i++) {
        result[i] = temp[i];
      }
    }
    
    return result;
  }

  // 强力图像修复
  function aggressiveInpainting(imageData: ImageData, mask: Uint8Array): ImageData {
    const { width, height, data } = imageData;
    const result = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // 3轮迭代填充
    for (let iteration = 0; iteration < 3; iteration++) {
      const tempMask = new Uint8Array(mask);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (tempMask[idx] === 1) {
            fillPixelAggressive(x, y, result, tempMask, width, height);
            tempMask[idx] = 0;
          }
        }
      }
    }
    
    // 最终平滑
    applyAggressiveSmoothing(result, mask, width, height);
    
    return result;
  }

  // 强力像素填充 - 16方向采样
  function fillPixelAggressive(
    x: number, y: number,
    imageData: ImageData,
    mask: Uint8Array,
    width: number, height: number
  ): void {
    const idx = (y * width + x) * 4;
    
    // 16个方向
    const numDirections = 16;
    const searchRadius = 50;
    
    let totalR = 0, totalG = 0, totalB = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < numDirections; i++) {
      const angle = (i / numDirections) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      
      for (let r = 1; r <= searchRadius; r++) {
        const nx = Math.round(x + dx * r);
        const ny = Math.round(y + dy * r);
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4;
          if (mask[ny * width + nx] === 0) {
            const dist = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2);
            const weight = 1 / (dist * dist);
            
            totalR += imageData.data[nIdx] * weight;
            totalG += imageData.data[nIdx + 1] * weight;
            totalB += imageData.data[nIdx + 2] * weight;
            totalWeight += weight;
            break;
          }
        }
      }
    }
    
    // 完全替换
    if (totalWeight > 0) {
      imageData.data[idx] = Math.round(totalR / totalWeight);
      imageData.data[idx + 1] = Math.round(totalG / totalWeight);
      imageData.data[idx + 2] = Math.round(totalB / totalWeight);
    }
  }

  // 强力平滑
  function applyAggressiveSmoothing(
    imageData: ImageData,
    mask: Uint8Array,
    width: number, height: number
  ): void {
    const original = new Uint8ClampedArray(imageData.data);
    const blurRadius = 5;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        if (mask[y * width + x] === 1) {
          const blurred = [0, 0, 0];
          let totalWeight = 0;
          
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const weight = Math.exp(-(dx * dx + dy * dy) / 6);
                const nIdx = (ny * width + nx) * 4;
                
                for (let c = 0; c < 3; c++) {
                  blurred[c] += original[nIdx + c] * weight;
                }
                totalWeight += weight;
              }
            }
          }
          
          if (totalWeight > 0) {
            for (let c = 0; c < 3; c++) {
              imageData.data[idx + c] = Math.round(blurred[c] / totalWeight);
            }
          }
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[calc(100vw-4rem)] max-w-5xl
          h-[calc(100vh-8rem)] max-h-[96vh]
          flex flex-col p-0 gap-0
          bg-background rounded-lg shadow-lg z-101
          overflow-hidden
        "
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">编辑图片 - {word.word_text} {word.phonetic}</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <h3 className="text-sm font-medium">编辑图片 — {word.word_text} {word.phonetic}</h3>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              {/* <X className="h-4 w-4" /> */}
            </Button>
          </DialogClose>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0 bg-muted/20 flex-wrap">
          {/* Shape tools */}
          {TOOLS.map((t) => (
            <Button
              key={t.key}
              variant={currentTool === t.key ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setCurrentTool(t.key);
                if (t.key !== 'pen') {
                  setIsDrawing(false);
                  setCurrentPenPoints([]);
                }
              }}
              title={t.label}
            >
              {t.icon}
            </Button>
          ))}

          <div className="w-px h-6 bg-border mx-2" />

          {/* Fill color - 涂鸦和线条选中时禁用 */}
          <div className={`flex items-center gap-1 ${selectedShapeTypeRef.current === 'pen' || selectedShapeTypeRef.current === 'line' ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-xs text-muted-foreground hidden sm:inline">填充</span>
            <input
              type="color"
              value={currentFill === 'transparent' ? '#ffffff' : currentFill}
              onChange={(e) => setCurrentFill(e.target.value)}
              className="w-7 h-7 p-0.5 rounded cursor-pointer border"
              title={selectedShapeTypeRef.current === 'pen' || selectedShapeTypeRef.current === 'line' ? "涂鸦和线条不支持填充" : "填充颜色"}
              disabled={selectedShapeTypeRef.current === 'pen' || selectedShapeTypeRef.current === 'line'}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => setCurrentFill('transparent')}
              title="透明填充"
              disabled={selectedShapeTypeRef.current === 'pen' || selectedShapeTypeRef.current === 'line'}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Stroke color */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground hidden sm:inline">边框</span>
            <input
              type="color"
              value={currentStroke}
              onChange={(e) => setCurrentStroke(e.target.value)}
              className="w-7 h-7 p-0.5 rounded cursor-pointer border"
              title="边框颜色"
            />
          </div>

          {/* Stroke width */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-xs text-muted-foreground hidden sm:inline">粗细</span>
            <select
              value={currentStrokeWidth}
              onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))}
              className="h-7 w-16 rounded border bg-background text-xs px-1"
              title={selectedShapeId ? "修改选中图形的边框粗细" : "设置新图形的边框粗细"}
            >
              {STROKE_WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w === 0 ? '无边框' : `${w}px`}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-border mx-2" />

          {/* 新增：去除水印按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={removeWatermark}
            disabled={!shapes.some(s => s.type === 'pen') || isRemovingWatermark}
            title="使用涂鸦区域作为蒙版去除水印"
          >
            {isRemovingWatermark ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">处理中...</span>
              </>
            ) : (
              <>
                <Droplets className="h-3 w-3" />
                <span className="text-xs">去除水印</span>
              </>
            )}
          </Button>

          <div className="flex-1 min-w-2" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive/80 hover:text-destructive"
            onClick={handleDelete}
            disabled={!selectedShapeId}
            title="删除选中图形 (Delete)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Canvas ── */}
        <div ref={containerRef} className="flex-1 bg-black/5 relative overflow-hidden p-4">
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onClick={handleStageInteraction}
            onTap={handleStageInteraction}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              {image && imageAttrs && (
                <KonvaImage
                  image={image}
                  x={imageAttrs.x}
                  y={imageAttrs.y}
                  width={imageAttrs.width}
                  height={imageAttrs.height}
                  listening={false}
                />
              )}
            </Layer>
            <Layer>
              {shapes.map(renderShape)}
              
              {/* 显示拖拽绘制中的形状 */}
              {isDrawingShape && drawingShape && (
                <>
                  {drawingShape.type === 'line' && (
                    <Line
                      points={drawingShape.points}
                      x={drawingShape.x}
                      y={drawingShape.y}
                      stroke={drawingShape.stroke}
                      strokeWidth={drawingShape.strokeWidth}
                      lineCap="round"
                      lineJoin="round"
                      tension={0}
                      dash={[5, 5]}
                      opacity={0.8}
                    />
                  )}
                  
                  {drawingShape.type === 'rect' && (
                    <Rect
                      x={drawingShape.x}
                      y={drawingShape.y}
                      width={drawingShape.width}
                      height={drawingShape.height}
                      fill={drawingShape.fill}
                      stroke={drawingShape.stroke}
                      strokeWidth={drawingShape.strokeWidth}
                      dash={[5, 5]}
                      opacity={0.8}
                    />
                  )}
                  
                  {drawingShape.type === 'circle' && (
                    <KonvaCircle
                      x={drawingShape.x}
                      y={drawingShape.y}
                      radius={drawingShape.radius}
                      fill={drawingShape.fill}
                      stroke={drawingShape.stroke}
                      strokeWidth={drawingShape.strokeWidth}
                      dash={[5, 5]}
                      opacity={0.8}
                    />
                  )}
                  
                  {drawingShape.type === 'triangle' && (
                    <RegularPolygon
                      x={drawingShape.x}
                      y={drawingShape.y}
                      sides={3}
                      radius={drawingShape.radius}
                      fill={drawingShape.fill}
                      stroke={drawingShape.stroke}
                      strokeWidth={drawingShape.strokeWidth}
                      rotation={drawingShape.rotation}
                      dash={[5, 5]}
                      opacity={0.8}
                    />
                  )}
                </>
              )}
              
              {isDrawing && currentPenPoints.length > 0 && (
                <Line
                  points={currentPenPoints}
                  stroke={currentStroke}
                  strokeWidth={currentStrokeWidth}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.5}
                  globalCompositeOperation="source-over"
                />
              )}
              <Transformer
                id="transformer"
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 10 || newBox.height < 10) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>

          {/* ── 新增：缩略图列表 ── */}
          {allImages.length > 1 && thumbnailImages.length > 0 && (
            <div className="absolute bottom-3 left-3 flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 shadow-lg border z-10">
              {thumbnailImages.map(({ url }) => (
                <div
                  key={url}
                  className={`
                    relative w-16 h-16 rounded-md overflow-hidden cursor-pointer border-2 transition-all
                    hover:scale-105 hover:shadow-md
                    ${currentImageUrl === url ? 'border-primary shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'}
                  `}
                  onClick={() => handleImageSwitch(url)}
                  title={currentImageUrl === url ? '当前图片' : '点击切换'}
                >
                  <img
                    src={url}
                    alt="缩略图"
                    className="w-full h-full object-cover"
                  />
                  {currentImageUrl === url && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-bl-md flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}          
        </div>


        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t shrink-0">
          <span className="text-[11px] text-muted-foreground mr-auto">
            单击画布放置图形 · 拖动移动 · 拖动手柄调整大小/旋转 · 按住鼠标涂鸦
          </span>
          <div className="flex items-center gap-1 mr-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">覆盖原图</span>
            <Switch
              checked={replaceMode}
              onCheckedChange={setReplaceMode}
            />
          </div>
          <div className="flex items-center gap-1 mr-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">重打音标</span>
            <Switch
              checked={phoneticMode}
              onCheckedChange={setPhoneticMode}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave}>
            {isSavingImage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> 保存
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditorDialog;