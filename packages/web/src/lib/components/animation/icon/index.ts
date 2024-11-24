import CircleCheck from './circle-check.svelte';
import CircleX from './circle-x.svelte';

export type CircleProps = {
  class?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  introend?: () => void;
  outroend?: () => void;
  circleintrostart?: () => void;
  circleintroend?: () => void;
  circleoutrostart?: () => void;
  circleoutroend?: () => void;
};

export { CircleCheck, CircleX };
