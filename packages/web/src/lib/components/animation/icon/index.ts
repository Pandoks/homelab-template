import CircleCheck from './circle-check.svelte';
import CircleX from './circle-x.svelte';

export type CircleProps = {
  class?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  introstart?: () => void;
  outrostart?: () => void;
  introend?: () => void;
  outroend?: () => void;
};

export { CircleCheck, CircleX };
