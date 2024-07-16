<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { Copy } from 'lucide-svelte';

  type $$Props = {
    class?: string;
    copy?: string;
    duration?: number;
  };

  let className: $$Props['class'] = undefined;
  export { className as class };
  export let copy = '';
  export let duration = 1500;

  let success = false;
  $: buttonStyle = success
    ? 'absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-14'
    : 'absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-6';
  const handleClick = async () => {
    await navigator.clipboard.writeText(copy);

    success = true;
    setTimeout(() => {
      success = false;
    }, duration);
  };
</script>

<div class="relative">
  <Input disabled class={cn('h-9 pr-8', className)} {...$$restProps} value={copy} />
  <Button class={buttonStyle} variant="outline" size="icon" on:click={handleClick}>
    {#if success}
      <p class="text-xs text-muted-foreground">Copied</p>
    {:else}
      <Copy size={12} />
    {/if}
  </Button>
</div>
