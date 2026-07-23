import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export default function LazyImage({ src, alt, fallback, className, ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && img.src !== src) {
          img.src = src || '';
          observer.unobserve(img);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gray-100 dark:bg-gray-800" />
      )}
      <img
        ref={imgRef}
        alt={alt || ''}
        className={`${className || ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
        loading="lazy"
        {...props}
      />
      {error && fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-xs text-gray-400">{fallback}</span>
        </div>
      )}
    </div>
  );
}