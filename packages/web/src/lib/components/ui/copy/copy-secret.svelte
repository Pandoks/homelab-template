<script lang="ts">
  import { CloseEyeOff } from '$lib/components/icon';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { Eye } from 'lucide-svelte';
  import type { CopyProps } from '.';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    copy = '',
    duration = 1200,
    size = 'xs',
    align = 'left',
    ...restProps
  }: CopyProps = $props();

  let isHidden = $state(true);
  let copied = $state(false);

  const buttonStyle = $derived(
    copied
      ? 'absolute top-1/2 -translate-y-1/2 right-[4px] h-6 w-14'
      : 'absolute top-1/2 -translate-y-1/2 right-[4px] h-6 w-6'
  );
  const inputStyles = {
    base: 'h-8 pr-8',
    variants: {
      hover: 'bg-slate-100'
    }
  };

  let inputStyle = $state(inputStyles.base);

  let clickTimeout: NodeJS.Timeout;
  const handleCopy = async () => {
    clearTimeout(clickTimeout);
    await navigator.clipboard.writeText(copy!);

    copied = true;
    clickTimeout = setTimeout(() => {
      copied = false;
    }, duration);
  };
</script>

<div class={cn('relative', className)}>
  <Input
    disabled
    class={cn(`text-${size} text-${align}`, inputStyle)}
    {...restProps}
    value={copy}
    type={isHidden ? 'password' : 'text'}
  />
  <!-- turns disabled Input component clickable -->
  <button
    class="absolute inset-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    onclick={handleCopy}
    onmouseenter={() => (inputStyle = cn(inputStyles.base, inputStyles.variants.hover))}
    onmouseleave={() => (inputStyle = inputStyles.base)}
    aria-label="Copy password"
  ></button>
  <Button
    class={buttonStyle}
    variant="outline"
    size="icon"
    onclick={() => {
      isHidden = copied ? isHidden : !isHidden;
    }}
  >
    {#if copied}
      <p class="text-xs text-muted-foreground">Copied</p>
    {:else if isHidden}
      <Eye size={14} />
    {:else}
      <CloseEyeOff size={14} />
    {/if}
  </Button>
</div>
