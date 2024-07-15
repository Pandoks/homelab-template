import Root from './copy.svelte';

type Props = {
  className?: string;
  variant?: 'default' | 'secret' | 'block';
  animate?: boolean;
};

export {
  Root,
  type Props,
  //
  Root as Copy,
  type Props as CopyProps
};
