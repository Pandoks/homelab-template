<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';
  import { Eye } from 'lucide-svelte';
  import { CloseEyeOff } from '$lib/components/icon';
  import type { WithElementRef } from 'bits-ui';

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    readonly,
    type,
    ...restProps
  }: WithElementRef<HTMLInputAttributes> = $props();
  let isHidden: boolean = $state(true);

  $effect(() => {
    type = isHidden ? 'password' : 'text';
  });
</script>

<div class="relative">
  <input
    bind:value
    class={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
      className
    )}
    {readonly}
    {type}
    {...restProps}
  />
  <button
    onclick={() => (isHidden = !isHidden)}
    type="button"
    class="absolute top-1/2 -translate-y-1/2 right-[8px] h-6 w-6"
  >
    {#if isHidden}
      <Eye size={16} />
    {:else}
      <CloseEyeOff size={16} />
    {/if}
  </button>
</div>
