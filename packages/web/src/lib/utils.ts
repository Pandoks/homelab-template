import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TransitionConfig } from 'svelte/transition';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const applyTransition = (
  node: HTMLElement,
  {
    transition,
    params
  }: { transition?: (node: Element, params?: any) => TransitionConfig; params: TransitionConfig }
) => {
  if (transition) {
    return transition(node, params);
  }

  // return a no-op transition if no transition is provided
  return { duration: 0 };
};
