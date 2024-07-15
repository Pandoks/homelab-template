<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { fade, fly } from 'svelte/transition';
  import { type Props } from './index';
  import { applyTransition, cn } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';
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

  export let successDuration: $$Props['successDuration'] = 1000;
  export let failDuration: $$Props['failDuration'] = 1000;

  let handleDuration = (duration: number) => {
    return () => {
      setTimeout(() => {
        // reset the button
        verified = false;
        errored = false;
        console.log('verified: ', verified);
        console.log('errored: ', errored);
        console.log('reset: ', reset);
      }, duration);
    };
  };

  let verified: boolean = false;
  let errored: boolean = false;
  let reset: boolean = true;
  let internalDone: boolean = false;

  $: if (success) {
    verified = true;
    errored = false;
    reset = false;
  }
  $: if (fail) {
    errored = true;
    verified = false;
    reset = false;
  }

  const dispatch = createEventDispatcher();
  const handleDispatch = (dispatchEvent: 'introstart' | 'introend' | 'outrostart' | 'outroend') => {
    return () => {
      if (dispatchEvent.includes('start')) {
        internalDone = false;
      } else {
        internalDone = true;
      }
      dispatch(dispatchEvent);
    };
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
        transition: loadingTransition ? loadingTransition.inTransition : undefined,
        params: loadingTransition ? loadingTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: loadingTransition ? loadingTransition.outTransition : undefined,
        params: loadingTransition ? loadingTransition.outParams : undefined
      }}
      on:introstart={handleDispatch('introstart')}
      on:introend={handleDispatch('introend')}
      on:outrostart={handleDispatch('outrostart')}
      on:outroend={handleDispatch('outroend')}
    >
      <slot name="loading" />
    </div>
  {:else if verified}
    <div
      in:applyTransition={{
        transition: successTransition ? successTransition.inTransition : undefined,
        params: successTransition ? successTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: successTransition ? successTransition.outTransition : undefined,
        params: successTransition ? successTransition.outParams : undefined
      }}
      on:introstart={handleDispatch('introstart')}
      on:introend={handleDispatch('introend')}
      on:outrostart={handleDispatch('outrostart')}
      on:outroend={() => {
        reset = true;
        handleDispatch('outroend')();
      }}
    >
      <slot
        name="success"
        handleIntroEnd={handleDuration(successDuration ? successDuration : 1000)}
      />
    </div>
  {:else if errored}
    <div
      in:applyTransition={{
        transition: failTransition ? failTransition.inTransition : undefined,
        params: failTransition ? failTransition.inParams : undefined
      }}
      out:applyTransition={{
        transition: failTransition ? failTransition.outTransition : undefined,
        params: failTransition ? failTransition.outParams : undefined
      }}
      on:introstart={handleDispatch('introstart')}
      on:introend={handleDispatch('introend')}
      on:outrostart={handleDispatch('outrostart')}
      on:outroend={() => {
        reset = true;
        handleDispatch('outroend')();
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
      on:introstart={handleDispatch('introstart')}
      on:introend={handleDispatch('introend')}
      on:outrostart={handleDispatch('outrostart')}
      on:outroend={handleDispatch('outroend')}
    >
      <slot />
    </div>
  {/if}
</Button>
