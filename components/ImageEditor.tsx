
import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';

interface ImageEditorProps {
  src: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount === 0) return;

  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const katet = Math.round(Math.sqrt(weights.length));
  const half = (katet * 0.5) | 0;
  const pixels = ctx.getImageData(0, 0, w, h);
  const R = 0, G = 1, B = 2, A = 3;

  const src = pixels.data;
  const dst = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < katet; cy++) {
        for (let cx = 0; cx < katet; cx++) {
          const scy = y + cy - half;
          const scx = x + cx - half;
          if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
            const src_i = (scy * w + scx) * 4;
            const wt = weights[cy * katet + cx];
            r += src[src_i + R] * wt;
            g += src[src_i + G] * wt;
            b += src[src_i + B] * wt;
          }
        }
      }
      dst[i + R] = r * amount + src[i + R] * (1 - amount);
      dst[i + G] = g * amount + src[i + G] * (1 - amount);
      dst[i + B] = b * amount + src[i + B] * (1 - amount);
      dst[i + A] = src[i + A];
    }
  }

  pixels.data.set(dst);
  ctx.putImageData(pixels, 0, 0);
}

function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop,
  options: {
    rotate: number;
    brightness: number;
    contrast: number;
    sharpen: number;
    vignette: number;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  const { rotate, brightness, contrast, sharpen, vignette } = options;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const rotateRads = (rotate * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  
  // Just crop the rectangle
  ctx.translate(-cropX, -cropY);
  ctx.beginPath();
  ctx.rect(cropX, cropY, crop.width * scaleX, crop.height * scaleY);
  ctx.closePath();
  ctx.clip();
  
  // Apply transformations and draw image
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(image, 0, 0);
  ctx.restore();

  // Apply post-processing effects that need the untransformed context
  if (sharpen > 0) {
    applySharpen(ctx, canvas.width, canvas.height, sharpen / 100);
  }
  
  // Apply Vignette
  if (vignette > 0) {
    ctx.save();
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width / 4,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    grad.addColorStop(0, `rgba(0,0,0,0)`);
    grad.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

const ImageEditor: React.FC<ImageEditorProps> = ({ src, onSave, onCancel }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const smallPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // Editing states
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sharpen, setSharpen] = useState(0);
  const [vignette, setVignette] = useState(0);
  
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      smallPreviewCanvasRef.current
    ) {
      canvasPreview(imgRef.current, smallPreviewCanvasRef.current, completedCrop, {
        rotate: rotation,
        brightness,
        contrast,
        sharpen,
        vignette,
      });
    }
  }, [completedCrop, rotation, zoom, brightness, contrast, sharpen, vignette]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  }

  const handleSave = () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;
    
    canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop, {
      rotate: rotation, brightness, contrast, sharpen, vignette
    });
    
    onSave(previewCanvasRef.current.toDataURL('image/png'));
  };
  
  const resetAll = () => {
    setRotation(0);
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setSharpen(0);
    setVignette(0);
    if(imgRef.current) onImageLoad({ currentTarget: imgRef.current } as React.SyntheticEvent<HTMLImageElement>);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Crop Profile Photo</h3>
        
        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
          <div className="md:col-span-2 bg-gray-200 dark:bg-gray-900 p-4 rounded-md flex items-center justify-center overflow-hidden">
             <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
             >
                <img
                    ref={imgRef}
                    alt="Crop area"
                    src={src}
                    onLoad={onImageLoad}
                    className="max-w-full max-h-full object-contain"
                    style={{ 
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    }}
                />
             </ReactCrop>
          </div>
          
          <div className="flex flex-col space-y-4 overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Live Preview</label>
              <div className="aspect-square w-full bg-gray-200 dark:bg-gray-900 rounded-md overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                  <canvas ref={smallPreviewCanvasRef} className="w-full h-full" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rotation: {rotation}°</label>
              <input type="range" min="0" max="360" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zoom: {Math.round(zoom * 100)}%</label>
              <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brightness: {brightness}%</label>
              <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contrast: {contrast}%</label>
              <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sharpen: {sharpen}%</label>
              <input type="range" min="0" max="100" value={sharpen} onChange={(e) => setSharpen(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vignette: {vignette}%</label>
              <input type="range" min="0" max="100" value={vignette} onChange={(e) => setVignette(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            type="button"
            onClick={resetAll}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Reset All
          </button>
          <div className="flex gap-3">
             <button onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition">
              Save Changes
            </button>
          </div>
        </div>
        <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default ImageEditor;
