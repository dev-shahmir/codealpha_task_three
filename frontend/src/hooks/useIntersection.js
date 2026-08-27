import { useEffect, useRef, useState } from 'react';

export const useIntersection = (options = {}) => {
  const ref = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setRatio(entry.intersectionRatio);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1], ...options });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isIntersecting, ratio };
};

export default useIntersection;
