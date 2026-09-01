import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-4 h-4', size = 16, color }) => {
  // @ts-ignore
  const IconComponent = Icons[name] || Icons.CircleDot;
  return <IconComponent className={className} size={size} color={color} />;
};
