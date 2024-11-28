import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

type ShakeParams = {
  duration?: number;
  intensity?: number;
  frequency?: number;
};

const shake = (node: HTMLElement, params?: ShakeParams): TransitionConfig => {
  const duration = params?.duration || 300;
  const frequency = params?.frequency || 10;
  const intensity = params?.intensity || 2;
  return {
    duration,
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
