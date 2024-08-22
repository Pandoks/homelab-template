import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

type ShakeParams = {
  duration?: number;
  intensity?: number;
  frequency?: number;
};

const shake = (
  node: Element,
  params: ShakeParams = { duration: 300, intensity: 10, frequency: 2 }
): TransitionConfig => {
  return {
    duration: params.duration,
    css: (t: number) => {
      const decay = Math.exp(-t * 3); // Exponential decay
      const oscillation = Math.sin(t * params.frequency! * Math.PI * 2);
      const offset = decay * oscillation * params.intensity!;

      return `
        transform: translateX(${offset}px);
        opacity: ${cubicOut(t)}
      `;
    }
  };
};

export default shake;
