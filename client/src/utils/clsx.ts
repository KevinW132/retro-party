type ClassValue = string | number | null | undefined | false | Record<string, boolean>;

export default function clsx(...values: ClassValue[]): string {
  const classes: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      classes.push(String(value));
    } else {
      for (const [key, active] of Object.entries(value)) {
        if (active) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}
