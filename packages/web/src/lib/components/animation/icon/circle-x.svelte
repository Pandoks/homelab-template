<script lang="ts">
  import { cn } from '$lib/utils';
  import { tick } from 'svelte';
  import { draw, type DrawParams } from 'svelte/transition';
  import type { CircleProps } from '.';

  type CircleXProps = CircleProps & {
    drawParams?: {
      left: DrawParams;
      right: DrawParams;
      circle: DrawParams;
    };
  };

  let {
    drawParams = {
      left: { duration: 1000 },
      right: { duration: 1000 },
      circle: { duration: 1000 }
    },
    class: className,
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    introstart,
    outrostart,
    introend,
    outroend,
    ...restProps
  }: CircleXProps = $props();

  let show: boolean = $state(true);
  export const restart = async () => {
    show = false;
    await tick();
    show = true;
  };

  let circleIntroEnd: boolean = $state(false);
  let circleOutroEnd: boolean = $state(false);
  let leftIntroEnd: boolean = $state(false);
  let leftOutroEnd: boolean = $state(false);
  let rightIntroEnd: boolean = $state(false);
  let rightOutroEnd: boolean = $state(false);

  $effect(() => {
    if (circleIntroEnd && leftIntroEnd && rightIntroEnd) {
      introend?.();
    }
  });

  $effect(() => {
    if (circleOutroEnd && leftOutroEnd && rightOutroEnd) {
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
    class={cn('lucide lucide-circle-x', className)}
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
        leftIntroEnd = true;
      }}
      onoutroend={() => {
        leftOutroEnd = true;
      }}
      d="m15 9-6 6"
      in:draw|global={drawParams?.left}
    />
    <path
      onintroend={() => {
        rightIntroEnd = true;
      }}
      onoutroend={() => {
        rightOutroEnd = true;
      }}
      d="m9 9 6 6"
      in:draw|global={drawParams?.right}
    />
  </svg>
{/if}
