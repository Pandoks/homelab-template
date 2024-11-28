import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

type ShakeParams = {
  duration?: number;
  delay?: number;
  intensity?: number;
  frequency?: number;
};

const shake = (node: HTMLElement, params?: ShakeParams): TransitionConfig => {
  const duration = params?.duration || 400;
  const frequency = params?.frequency || 5;
  const intensity = params?.intensity || 7;
  const delay = params?.delay || 0;
  return {
    duration,
    delay,
    css: (t: number) => {
      const decay = Math.exp(-t * 3); // Exponential decay
      const oscillation = Math.sin(t * frequency * Math.PI * 2);
      const offset = decay * oscillation * intensity;

      return `
        transform: translateX(${offset}px);
        opacity: ${cubicOut(t)}
      `;
    }
  };
};

export default shake;
