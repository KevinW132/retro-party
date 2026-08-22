import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from '@/utils/clsx';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

interface ButtonProps extends NativeButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<string, string> = {
  primary: 'btn-arcade',
  secondary: 'btn-arcade-secondary',
  danger: 'btn-arcade-danger',
};

export function Button({ children, variant = 'primary', icon, className, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={clsx(VARIANT_CLASS[variant], 'inline-flex items-center justify-center gap-2', className)}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  );
}
