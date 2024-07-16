<script lang="ts">
  import { cn } from '$lib/utils';
  import { createEventDispatcher, tick } from 'svelte';
  import { draw, type DrawParams } from 'svelte/transition';

  type $$Props = {
    drawParams?: {
      check?: DrawParams;
      circle?: DrawParams;
    };
    class?: string;
    size?: number;
    color?: string;
    strokeWidth?: number;
  };

  let className: $$Props['class'] = undefined;
  export let drawParams: $$Props['drawParams'] = {
    check: { duration: 1000 },
    circle: { duration: 1000 }
  };
  export let size: $$Props['size'] = 24;
  export let color: $$Props['color'] = 'currentColor';
  export let strokeWidth: $$Props['strokeWidth'] = 2;
  export { className as class };

  let show: boolean = true;
  export const restart = async () => {
    show = false;
    await tick();
    show = true;
  };

  const dispatch = createEventDispatcher();
  let circleIntroEnd: boolean = false;
  let checkIntroEnd: boolean = false;
  let circleOutroEnd: boolean = false;
  let checkOutroEnd: boolean = false;

  $: if (circleIntroEnd && checkIntroEnd) {
    dispatch('introend');
  }
  $: if (circleOutroEnd && checkOutroEnd) {
    dispatch('outroend');
  }
</script>

{#if show}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={cn('lucide lucide-circle-check', className)}
    {...$$restProps}
  >
    <path
      on:introstart={() => dispatch('circleintrostart')}
      on:introend={() => {
        circleIntroEnd = true;
        dispatch('circleintroend');
      }}
      on:outrostart={() => dispatch('circleoutrostart')}
      on:outroend={() => {
        circleOutroEnd = true;
        dispatch('circleoutroend');
      }}
      d="M12 2 A 10 10 0 0 1 12 22 A 10 10 0 0 1 12 2"
      in:draw|global={drawParams?.circle}
    />
    <path
      on:introstart={() => dispatch('checkintrostart')}
      on:introend={() => {
        checkIntroEnd = true;
        dispatch('checkintroend');
      }}
      on:outrostart={() => dispatch('checkoutrostart')}
      on:outroend={() => {
        checkOutroEnd = true;
        dispatch('checkoutroend');
      }}
      d="m9 12 2 2 4-4"
      in:draw|global={drawParams?.check}
    />
  </svg>
{/if}
