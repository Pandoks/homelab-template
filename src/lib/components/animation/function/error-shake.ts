import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

type ShakeParams = {
  duration?: number;
  intensity?: number;
};

const shake = (
  node: Element,
  params: ShakeParams = { duration: 300, intensity: 5 }
): TransitionConfig => {
  return {
    duration: params.duration,
    css: (time: number) => {
      const eased = cubicOut(time);
      const shakeIntensity = Math.sin(time * Math.PI * 4) * params!.intensity! * (1 - eased);
      return `
        transform: translateX(${shakeIntensity}px);
        opacity: ${eased}
      `;
    }
  };
};

export default shake;
