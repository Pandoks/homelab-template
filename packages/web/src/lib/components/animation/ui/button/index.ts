import { type TransitionConfig } from 'svelte/transition';
import Root from './condition-button.svelte';
import type { Snippet } from 'svelte';

type Transition = (node: Element, params?: any) => TransitionConfig;

export type BooleanButtonProps = {
  class?: string;
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
  loadingChild?: Snippet;
  successChild?: Snippet;
  failChild?: Snippet;
  children?: Snippet;
  onintrostart?: () => void;
  onintroend?: () => void;
  onoutrostart?: () => void;
  onoutroend?: () => void;
};

export {
  Root,
  //
  Root as BooleanButton
};
