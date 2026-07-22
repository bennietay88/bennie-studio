import React, { useState, useEffect } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  className?: string;
  containerClassName?: string;
}

export function SafeImage({ 
  src, 
  alt, 
  fallback, 
  className,
  containerClassName,
  ...props 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
    setLoading(true);
  }, [src]);

  const handleError = () => {
    if (!error) {
      setError(true);
      if (fallback) {
        setImgSrc(fallback);
      } else {
        setImgSrc(undefined);
      }
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      )}
      
      {error && !imgSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
          <ImageOff className="h-8 w-8 mb-2 opacity-20" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Image Unavailable</span>
        </div>
      )}

      {imgSrc && (
        <img
          {...props}
          src={imgSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-500",
            loading ? "opacity-0" : "opacity-100",
            className
          )}
          onError={handleError}
          onLoad={handleLoad}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
