import Root from './link-countdown.svelte';

type Props = {
  method?: 'GET' | 'POST';
  action?: string;
  duration?: number;
  class?: string;
};

export {
  type Props,
  Root,
  //
  type Props as LinkCountdownProps,
  Root as LinkCountdown
};
