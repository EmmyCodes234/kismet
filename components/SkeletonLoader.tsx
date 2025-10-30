import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  style?: React.CSSProperties;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '', style }) => {
  return (
    <div
      className={`bg-slate-700 rounded animate-pulse ${className}`}
      style={style}
    ></div>
  );
};

export default SkeletonLoader;
