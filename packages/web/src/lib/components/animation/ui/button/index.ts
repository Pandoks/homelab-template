import { type TransitionConfig } from 'svelte/transition';
import Root from './boolean-button.svelte';
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
  loadingSnippet?: Snippet;
  successSnippet?: Snippet;
  failSnippet?: Snippet;
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
