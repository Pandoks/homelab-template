<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { Copy } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import type { CopyProps } from '.';

  let {
    class: className,
    copy = '',
    duration = 1500,
    size = 'xs',
    align = 'left',
    children,
    ...restProps
  }: CopyProps & { children: Snippet } = $props();

  let copied = $state(false);
  const buttonStyle = $derived(
    copied
      ? 'absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-14'
      : 'absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-6'
  );
  let clickTimeout: NodeJS.Timeout;
  const handleClick = async () => {
    clearTimeout(clickTimeout);
    await navigator.clipboard.writeText(copy);

    copied = true;
    clickTimeout = setTimeout(() => {
      copied = false;
    }, duration);
  };
</script>

<div class={cn('relative', className)}>
  <Input
    disabled
    class={cn(`text-${size} text-${align} h-9 pr-8`, className)}
    {...restProps}
    value={copy}
  />
  <Button class={buttonStyle} variant="outline" size="icon" onclick={handleClick}>
    {#if copied}
      <p class="text-xs text-muted-foreground">Copied</p>
    {:else}
      <Copy size={12} />
    {/if}
  </Button>
</div>
