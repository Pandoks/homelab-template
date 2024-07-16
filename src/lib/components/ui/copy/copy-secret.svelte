<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { Copy } from 'lucide-svelte';

  type $$Props = {
    class?: string;
    copy?: string;
    animate?: boolean;
  };

  let className: $$Props['class'] = undefined;
  export { className as class };
  export let copy = '';
</script>

<div class="relative">
  <Input disabled class={cn('h-9 pr-8', className)} {...$$restProps} value={copy} />
  <Button class="absolute top-1/2 -translate-y-1/2 right-1.5 h-6 w-6" variant="outline" size="icon">
    <Copy size={12} />
  </Button>
</div>
