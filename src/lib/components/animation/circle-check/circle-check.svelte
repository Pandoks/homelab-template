<script lang="ts">
  import { cn } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';
  import { draw, type DrawParams } from 'svelte/transition';

  export let drawParams: { check: DrawParams; circle: DrawParams } = {
    check: { duration: 1000 },
    circle: { duration: 1000 }
  };
  let className: string | null | undefined = undefined;
  export { className as class };

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

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  shape-rendering="geometricPrecision"
  class={cn('lucide lucide-circle-check', className)}
  {...$$restProps}
>
  <path
    on:introstart={() => {
      dispatch('circleintrostart');
    }}
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
    in:draw={drawParams.circle}
  />
  <path
    on:introstart={() => {
      checkIntroEnd = true;
      dispatch('checkintrostart');
    }}
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
    in:draw={drawParams.check}
  />
</svg>
