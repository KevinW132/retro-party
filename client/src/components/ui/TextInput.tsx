import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from '@/utils/clsx';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, id, className, ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label htmlFor={id} className="font-display text-[9px] uppercase tracking-widest text-arcade-blue">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'bg-panel2 pixel-border px-4 py-3 text-white placeholder-white/30 outline-none w-full',
          'focus-visible:ring-0 min-h-[44px]',
          className,
        )}
        {...rest}
      />
    </div>
  );
});
