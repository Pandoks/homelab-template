<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { InputEvents } from './index.js';
  import { cn } from '$lib/utils.js';
  import { Eye } from 'lucide-svelte';
  import { CloseEyeOff } from '$lib/components/icon';

  type $$Props = HTMLInputAttributes;
  type $$Events = InputEvents;

  let className: $$Props['class'] = undefined;
  export let value: $$Props['value'] = undefined;
  export { className as class };

  let isHidden: boolean = true;

  // Workaround for https://github.com/sveltejs/svelte/issues/9305
  // Fixed in Svelte 5, but not backported to 4.x.
  export let readonly: $$Props['readonly'] = undefined;

  // hacky way to let you use input types on native input element
  $: restProps = { ...$$restProps, type: isHidden ? 'password' : 'text' };
</script>

<div class="relative">
  <input
    bind:value
    class={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
      className
    )}
    {readonly}
    on:blur
    on:change
    on:click
    on:focus
    on:focusin
    on:focusout
    on:keydown
    on:keypress
    on:keyup
    on:mouseover
    on:mouseenter
    on:mouseleave
    on:mousemove
    on:paste
    on:input
    on:wheel|passive
    {...restProps}
  />
  <button
    on:click={() => (isHidden = !isHidden)}
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
