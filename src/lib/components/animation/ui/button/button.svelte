<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { fade, fly } from 'svelte/transition';
  import { type Props } from './index';
  import { applyTransition, cn } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';

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
  export let failTransition: $$Props['failTransition'] = {};
  export let resetTransition: $$Props['resetTransition'] = {
    inTransition: fade,
    inParams: { duration: 300 }
  };

  export let successDuration: $$Props['successDuration'] = 1000;
  export let failDuration: $$Props['failDuration'] = 1000;

  let handleDuration = (duration: number) => {
    return () => {
      setTimeout(() => {
        // reset the button
        success = false;
        fail = false;
        console.log('test');
      }, duration);
    };
  };

  let reset: boolean = true;

  $: if (success) {
    reset = false;
  }

  const dispatch = createEventDispatcher();
</script>

<Button
  disabled={loadingDisable && loading}
  class={cn('overflow-hidden', className)}
  {...$$restProps}
>
  {#if loading}
    <div
      in:applyTransition={{
        transition: loadingTransition ? loadingTransition.inTransition : undefined,
        params: loadingTransition ? loadingTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: loadingTransition ? loadingTransition.outTransition : undefined,
        params: loadingTransition ? loadingTransition.outParams : undefined
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => dispatch('outroend')}
    >
      <slot name="loading" />
    </div>
  {:else if success}
    <div
      in:applyTransition={{
        transition: successTransition ? successTransition.inTransition : undefined,
        params: successTransition ? successTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: successTransition ? successTransition.outTransition : undefined,
        params: successTransition ? successTransition.outParams : undefined
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => {
        reset = true;
        dispatch('outroend');
      }}
    >
      <slot
        name="success"
        handleIntroEnd={handleDuration(successDuration ? successDuration : 1000)}
      />
    </div>
  {:else if fail}
    <div
      in:applyTransition={{
        transition: failTransition ? failTransition.inTransition : undefined,
        params: failTransition ? failTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: failTransition ? failTransition.outTransition : undefined,
        params: failTransition ? failTransition.outParams : undefined
      }}
      on:introstart={() => dispatch('introstart')}
      on:introend={() => dispatch('introend')}
      on:outrostart={() => dispatch('outrostart')}
      on:outroend={() => {
        reset = true;
        dispatch('outroend');
      }}
    >
      <slot name="fail" handleIntroEnd={handleDuration(failDuration ? failDuration : 1000)} />
    </div>
  {:else if reset}
    <div
      in:applyTransition={{
        transition: resetTransition ? resetTransition.inTransition : undefined,
        params: resetTransition ? resetTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: resetTransition ? resetTransition.outTransition : undefined,
        params: resetTransition ? resetTransition.outParams : undefined
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
