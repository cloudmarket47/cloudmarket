import { useEffect, useRef, ReactNode } from 'react';

interface StaggeredRevealProps {
  children: ReactNode[];
  className?: string;
  threshold?: number;
  staggerDelay?: number;
}

export function StaggeredReveal({ 
  children, 
  className = '',
  threshold = 0.2,
  staggerDelay = 100
}: StaggeredRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('.stagger-item');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            items.forEach((item, index) => {
              setTimeout(() => {
                item.classList.add('revealed');
              }, index * staggerDelay);
            });
          } else {
            // Remove revealed class when scrolling back up
            items.forEach((item) => {
              item.classList.remove('revealed');
            });
          }
        });
      },
      {
        threshold,
        rootMargin: '0px'
      }
    );

    observer.observe(container);

    return () => {
      if (container) {
        observer.unobserve(container);
      }
    };
  }, [threshold, staggerDelay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
