import Text from './copy.svelte';
import Secret from './copy-secret.svelte';

export type CopyProps = {
  class?: string;
  copy?: string;
  duration?: number;
  size?:
    | 'xs'
    | 'sm'
    | 'base'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | '8xl'
    | '9xl';
  align?: 'left' | 'center' | 'right';
};

export {
  Text,
  Secret,
  //
  Text as CopyText,
  Secret as CopySecret
};
