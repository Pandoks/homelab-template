import { type TransitionConfig } from 'svelte/transition';
import Root from './button.svelte';
import type { ButtonProps } from '$lib/components/ui/button';

type Transition = (node: Element, params?: any) => TransitionConfig;

type Props = ButtonProps & {
  loading?: boolean;
  success?: boolean;
  successDuration?: number;
  fail?: boolean;
  failDuration?: number;
  loadingDisable?: boolean;
  loadingTransition?: {
    inTransition?: Transition;
    inParams?: any;
    outTransition?: Transition;
    outParams?: any;
  };
  successTransition?: {
    inTransition?: Transition;
    inParams?: any;
    outTransition?: Transition;
    outParams?: any;
  };
  failTransition?: {
    inTransition?: Transition;
    inParams?: any;
    outTransition?: Transition;
    outParams?: any;
  };
  resetTransition?: {
    inTransition?: Transition;
    inParams?: any;
    outTransition?: Transition;
    outParams?: any;
  };
};

export {
  Root,
  type Props,
  //
  Root as Button,
  type Props as ButtonProps
};
