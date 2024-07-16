<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import type { Props } from '.';

  type $$Props = Props;

  let className: $$Props['className'] = undefined;
  export let variant: $$Props['variant'] = 'default';
  export let animate: $$Props['animate'] = false;
  export { className as class };

  let slotElement: HTMLElement;
  $: copyText = slotElement?.textContent || '';
</script>

<div bind:this={slotElement} class="hidden">
  <slot />
</div>

{#if variant !== 'code'}
  <Input disabled class={cn('h-8', className)} {...$$restProps} value={copyText} />
{:else}{/if}
