<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { fade, fly, type TransitionConfig } from 'svelte/transition';
  import { applyTransition, cn } from '$lib/utils';
  import { tick } from 'svelte';
  import { errorShake } from '$lib/components/animation/function';
  import { type BooleanButtonProps } from '.';

  let {
    class: className,
    loading = false,
    success = false,
    fail = false,
    loadingDisable = true,
    loadingTransition = {},
    successTransition = {
      outTransition: fly,
      outParams: { duration: 300, y: 30 }
    },
    failTransition = {
      inTransition: errorShake,
      outTransition: fly,
      outParams: { duration: 300, y: 30 }
    },
    resetTransition = {
      inTransition: fade,
      inParams: { duration: 300 }
    },
    successDuration = 1500,
    failDuration = 1500,
    onintrostart,
    onintroend,
    onoutrostart,
    onoutroend,
    loadingChild,
    successChild,
    failChild,
    children,
    ...restProps
  }: BooleanButtonProps = $props();

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

  let verified: boolean = $state(false);
  let errored: boolean = $state(false);
  let normal: boolean = $state(true);
  let skip: boolean = $state(false);

  $effect(() => {
    if (success) {
      verified = true;
      errored = false;
      normal = false;
    }
  });

  $effect(() => {
    if (fail) {
      errored = true;
      verified = false;
      normal = false;
    }
  });

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
  {...restProps}
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
      {onintrostart}
      {onintroend}
      {onoutrostart}
      {onoutroend}
    >
      {@render loadingChild?.()}
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
      {onintrostart}
      {onintroend}
      {onoutrostart}
      onoutroend={() => {
        normal = true;
        onoutroend?.();
      }}
    >
      {@render successChild?.()}
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
      {onintrostart}
      {onintroend}
      {onoutrostart}
      onoutroend={() => {
        normal = true;
        onoutroend?.();
      }}
    >
      {@render failChild?.()}
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
      {onintrostart}
      {onintroend}
      {onoutrostart}
      {onoutroend}
    >
      {@render children?.()}
    </div>
  {/if}
</Button>
