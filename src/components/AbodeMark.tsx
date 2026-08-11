/**
 * The Abode mark: two wings split by a diagonal gap, traced from the supplied logo.
 * Paths follow the measured edges of the original, on a 54 x 40 grid.
 */
export function AbodeMark({ className = "h-6 w-[32px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 40" className={className} aria-hidden focusable="false">
      <path d="M33 0h8q1 20-27 40H0V29Q30 20 33 0Z" fill="currentColor" />
      <path d="M45 0h9v40H26Q44 20 45 0Z" fill="currentColor" />
    </svg>
  );
}
