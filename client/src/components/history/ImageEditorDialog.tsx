import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import {
  X,
  MousePointer2,
  Minus,
  Circle,
  Square,
  Triangle,
  Trash2,
  Save,
  Pen,
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
      return { ...base, x: pointerX, y: pointerY, points: [-60, 0, 60, 0], width: 0, height: 0, radius: 0 };
    case 'circle':
      return { ...base, x: pointerX, y: pointerY, radius: 50, width: 0, height: 0, points: [] };
    case 'rect':
      return { ...base, x: pointerX, y: pointerY, width: 100, height: 80, radius: 0, points: [] };
    case 'triangle':
      return { ...base, x: pointerX, y: pointerY, radius: 50, width: 0, height: 0, points: [] };
    case 'pen':
      return { ...base, x: 0, y: 0, points: [pointerX, pointerY], width: 0, height: 0, radius: 0, stroke: stroke, fill: 'transparent' };
  }
}

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  wordText: string;
  onSave: (dataUrl: string, url: string, redact: boolean, replace: boolean) => void;
}

const TOOLS: { key: ShapeType; icon: React.ReactNode; label: string }[] = [
  { key: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: '选择' },
  { key: 'pen', icon: <Pen className="h-4 w-4" />, label: '涂鸦' },
  { key: 'line', icon: <Minus className="h-4 w-4" />, label: '线条' },
  { key: 'circle', icon: <Circle className="h-4 w-4" />, label: '圆形' },
  { key: 'rect', icon: <Square className="h-4 w-4" />, label: '方形' },
  { key: 'triangle', icon: <Triangle className="h-4 w-4" />, label: '三角形' },
];

const STROKE_WIDTHS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const ImageEditorDialog: React.FC<ImageEditorDialogProps> = ({
  open,
  onOpenChange,
  imageUrl,
  wordText,
  onSave,
}) => {
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ShapeType>('select');
  const [currentFill, setCurrentFill] = useState('transparent');
  const [currentStroke, setCurrentStroke] = useState('#ff6b6b');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  // Pen drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPenPoints, setCurrentPenPoints] = useState<number[]>([]);

  const [replaceMode, setReplaceMode] = useState(false);
  const [phoneticMode, setPhoneticMode] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const programmaticStyleRef = useRef(false);
  const selectedShapeTypeRef = useRef<ShapeData['type'] | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShapes([]);
      setSelectedShapeId(null);
      setCurrentTool('select');
      setIsDrawing(false);
      setCurrentPenPoints([]);
      selectedShapeTypeRef.current = null;
    }
  }, [open]);

  // Load the image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
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
    if (currentTool !== 'pen') return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    setIsDrawing(true);
    setCurrentPenPoints([pos.x, pos.y]);
  }, [currentTool]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || currentTool !== 'pen') return;
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    setCurrentPenPoints(prev => [...prev, pos.x, pos.y]);
  }, [isDrawing, currentTool]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentTool !== 'pen') return;
    
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
  }, [isDrawing, currentTool, currentPenPoints, currentStroke, currentStrokeWidth]);

  const handleStageInteraction = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (currentTool === 'pen') return; // Pen tool handled separately
      
      const clickedStage = e.target === e.target.getStage();
      
      if (currentTool !== 'select' && clickedStage) {
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;
        const shape = createDefaultShape(
          currentTool,
          pos.x,
          pos.y,
          currentFill,
          currentStroke,
          currentStrokeWidth
        );
        setShapes((prev) => [...prev, shape]);
        setSelectedShapeId(shape.id);
        setCurrentTool('select');
        return;
      }
      
      if (clickedStage) {
        setSelectedShapeId(null);
      }
    },
    [currentTool, currentFill, currentStroke, currentStrokeWidth]
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

  // Export the canvas as a PNG and download it
  const handleSave = useCallback(() => {
    if (!stageRef.current) return;
    
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

    onSave(dataUrl, imageUrl, phoneticMode, replaceMode);
    // const link = document.createElement('a');
    // link.download = `${wordText}-edited.png`;
    // link.href = dataUrl;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);

  }, [wordText, imageUrl, onSave, replaceMode, phoneticMode]);

  // Render a single shape
  const renderShape = (shape: ShapeData) => {
    const common = {
      id: shape.id,
      key: shape.id,
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
        return <Line {...common} points={shape.points} lineCap="round" lineJoin="round" tension={0} />;
      case 'circle':
        return <KonvaCircle {...common} radius={shape.radius} />;
      case 'rect':
        return <Rect {...common} width={shape.width} height={shape.height} />;
      case 'triangle':
        return <RegularPolygon {...common} sides={3} radius={shape.radius} />;
      case 'pen':
        return (
          <Line
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[calc(100vw-1rem)] max-w-5xl
          h-[calc(100vh-2rem)] max-h-[96vh]
          flex flex-col p-0 gap-0
          bg-background rounded-lg shadow-lg z-101
          overflow-hidden
        "
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">编辑图片 - {wordText}</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <h3 className="text-sm font-medium">编辑图片 — {wordText}</h3>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <X className="h-4 w-4" />
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
        <div ref={containerRef} className="flex-1 bg-black/5 relative overflow-hidden">
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
            <Save className="h-4 w-4 mr-1" /> 保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditorDialog;