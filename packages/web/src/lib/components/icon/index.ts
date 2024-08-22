import CloseEyeOff from './close-eye-off.svelte';

type Props = {
  class?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export {
  type Props,
  CloseEyeOff,
  //
  type Props as IconProps,
  CloseEyeOff as CloseEyeOffIcon
};
