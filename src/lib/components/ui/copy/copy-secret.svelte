<script lang="ts">
  import { CloseEyeOff } from '$lib/components/icon';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { Eye } from 'lucide-svelte';

  type $$Props = {
    class?: string;
    copy?: string;
    duration?: number;
    size?:
      | 'xs'
      | 'sm'
      | 'base'
      | 'lg'
      | 'xl'
      | '2xl'
      | '3xl'
      | '4xl'
      | '5xl'
      | '6xl'
      | '7xl'
      | '8xl'
      | '9xl';
    align?: 'left' | 'center' | 'right';
  };

  let className: $$Props['class'] = undefined;
  export { className as class };
  export let copy: $$Props['copy'] = '';
  export let duration = 1200;
  export let size = 'xs';
  export let align = 'left';

  let isHidden: boolean = true;

  let copied = false;
  $: buttonStyle = copied
    ? 'absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-14'
    : 'absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-6';

  const inputStyles = {
    base: 'h-9 pr-8',
    variants: {
      hover: 'bg-slate-100'
    }
  };
  let inputStyle = inputStyles.base;

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
    {...$$restProps}
    value={copy}
    type={isHidden ? 'password' : 'text'}
  />
  <!-- turns disabled Input component clickable -->
  <button
    class="absolute inset-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    on:click={handleCopy}
    on:mouseenter={() => (inputStyle = cn(inputStyles.base, inputStyles.variants.hover))}
    on:mouseleave={() => (inputStyle = inputStyles.base)}
    aria-label="Copy password"
  />
  <Button
    class={buttonStyle}
    variant="outline"
    size="icon"
    on:click={() => {
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
