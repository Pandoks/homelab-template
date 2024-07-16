<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { fade, fly, type TransitionConfig } from 'svelte/transition';
  import { type Props } from './index';
  import { applyTransition, cn } from '$lib/utils';
  import { createEventDispatcher, tick } from 'svelte';
  import { errorShake } from '$lib/components/animation/function';

  type $$Props = Props;

  let className: $$Props['class'] = undefined;
  export { className as class };
  export let loading: $$Props['loading'] = false;
  export let success: $$Props['success'] = false;
  export let fail: $$Props['fail'] = false;
  export let loadingDisable: $$Props['loadingDisable'] = true;

  export let loadingTransition: $$Props['loadingTransition'] = {};
  export let successTransition: $$Props['successTransition'] = {
    outTransition: fly,
    outParams: { duration: 300, y: 30 }
  };
  export let failTransition: $$Props['failTransition'] = {
    inTransition: errorShake,
    outTransition: fly,
    outParams: { duration: 300, y: 30 }
  };
  export let resetTransition: $$Props['resetTransition'] = {
    inTransition: fade,
    inParams: { duration: 300 }
  };

  // Includes the time it takes for whatever is animating inside
  export let successDuration: $$Props['successDuration'] = 1500;
  export let failDuration: $$Props['failDuration'] = 1000;

  let timeout: NodeJS.Timeout;

  const handleDurationTransition = (
    node: HTMLElement,
    {
      transition,
      params,
      duration
    }: {
      transition?: (node: Element, params?: any) => TransitionConfig;
      params: TransitionConfig;
      duration: number;
    }
  ) => {
    if (skip) {
      return {};
    }

    timeout = setTimeout(() => {
      // reset the button
      verified = false;
      errored = false;
    }, duration);
    return applyTransition(node, { transition: transition, params: params });
  };

  let verified: boolean = false;
  let errored: boolean = false;
  let normal: boolean = true;
  let skip: boolean = false;

  $: if (success) {
    verified = true;
    errored = false;
    normal = false;
  }
  $: if (fail) {
    errored = true;
    verified = false;
    normal = false;
  }

  const dispatch = createEventDispatcher();

  export const reset = async () => {
    clearTimeout(timeout);
    skip = true;
    verified = false;
    errored = false;
    loading = false;

    await tick();
    skip = false;
  };
</script>

<Button
  disabled={loadingDisable && loading}
  class={cn('overflow-hidden', className)}
  {...$$restProps}
>
  {#if loading}
    <div
      in:applyTransition={{
        transition: !skip ? loadingTransition?.inTransition : undefined,
        params: loadingTransition?.inParams
      }}
      out:applyTransition={{
        transition: !skip ? loadingTransition?.outTransition : undefined,
        params: loadingTransition?.outParams
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => dispatch('outroend')}
    >
      <slot name="loading" />
    </div>
  {:else if verified}
    <div
      in:handleDurationTransition={{
        transition: successTransition?.inTransition,
        params: successTransition?.inParams,
        duration: successDuration ? successDuration : 1500
      }}
      out:applyTransition={{
        transition: !skip ? successTransition?.outTransition : undefined,
        params: successTransition?.outParams
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => {
        normal = true;
        dispatch('outroend');
      }}
    >
      <slot name="success" />
    </div>
  {:else if errored}
    <div
      in:handleDurationTransition={{
        transition: failTransition?.inTransition,
        params: failTransition?.inParams,
        duration: failDuration ? failDuration : 1500
      }}
      out:applyTransition={{
        transition: !skip ? failTransition?.outTransition : undefined,
        params: failTransition?.outParams
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => {
        normal = true;
        dispatch('outroend');
      }}
    >
      <slot name="fail" />
    </div>
  {:else if normal}
    <div
      in:applyTransition={{
        transition: !skip ? resetTransition?.inTransition : undefined,
        params: resetTransition?.inParams
      }}
      out:applyTransition={{
        transition: !skip ? resetTransition?.outTransition : undefined,
        params: resetTransition?.outParams
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => dispatch('outroend')}
    >
      <slot />
    </div>
  {/if}
</Button>
