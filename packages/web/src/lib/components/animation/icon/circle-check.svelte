<script lang="ts">
  import { cn } from '$lib/utils';
  import { tick } from 'svelte';
  import { draw, type DrawParams } from 'svelte/transition';
  import type { CircleProps } from '.';

  type CircleCheckProps = CircleProps & {
    drawParams?: {
      check?: DrawParams;
      circle?: DrawParams;
    };
  };

  let {
    class: className,
    drawParams = {
      check: { duration: 1000 },
      circle: { duration: 1000 }
    },
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    introend,
    outroend,
    ...restProps
  }: CircleCheckProps = $props();

  let show: boolean = $state(true);
  export const restart = async () => {
    show = false;
    await tick();
    show = true;
  };

  let circleIntroEnd: boolean = $state(false);
  let checkIntroEnd: boolean = $state(false);
  let circleOutroEnd: boolean = $state(false);
  let checkOutroEnd: boolean = $state(false);

  $effect(() => {
    if (circleIntroEnd && checkIntroEnd) {
      introend?.();
    }
  });

  $effect(() => {
    if (circleOutroEnd && checkOutroEnd) {
      outroend?.();
    }
  });
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
    {...restProps}
  >
    <path
      onintroend={() => {
        circleIntroEnd = true;
      }}
      onoutroend={() => {
        circleOutroEnd = true;
      }}
      d="M12 2 A 10 10 0 0 1 12 22 A 10 10 0 0 1 12 2"
      in:draw|global={drawParams?.circle}
    />
    <path
      onintroend={() => {
        checkIntroEnd = true;
      }}
      onoutroend={() => {
        checkOutroEnd = true;
      }}
      d="m9 12 2 2 4-4"
      in:draw|global={drawParams?.check}
    />
  </svg>
{/if}
