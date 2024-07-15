<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import type { Props } from '.';

  type $$Props = Props;

  let className: $$Props['className'] = undefined;
  export let variant: $$Props['variant'] = 'default';
  export let animate: $$Props['animate'] = false;
  export { className as class };

  let copyText: string = '';
  $: console.log(copyText);
</script>

<Input value="test" disabled class={cn('h-8', className)} {...$$restProps}></Input>
