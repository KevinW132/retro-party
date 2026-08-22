import { ReactNode } from 'react';
import clsx from '@/utils/clsx';

const COLOR_CLASS: Record<string, string> = {
  purple: 'text-arcade-purple',
  blue: 'text-arcade-blue',
  green: 'text-arcade-green',
  yellow: 'text-arcade-yellow',
  pink: 'text-arcade-pink',
  white: 'text-white',
};

export function GlowText({
  children,
  color = 'purple',
  as: Tag = 'span',
  className,
}: {
  children: ReactNode;
  color?: keyof typeof COLOR_CLASS;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}) {
  return <Tag className={clsx('glow-text', COLOR_CLASS[color], className)}>{children}</Tag>;
}
