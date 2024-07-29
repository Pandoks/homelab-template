<script lang="ts">
  import { Button, type Props } from './index';

  type $$Props = Props & { response: Response };

  let className: $$Props['class'] = undefined;
  export let variant: $$Props['variant'] = 'default';
  export let size: $$Props['size'] = 'default';
  export let builders: $$Props['builders'] = [];
  export let response: Response; // bind this in parent component
  export { className as class };

  const handleSignOut = async () => {
    response = await fetch('/auth/logout', {
      method: 'POST'
    });
  };
</script>

<Button {variant} {size} class={className} {builders} on:click={handleSignOut} {...$$restProps}>
  <slot />
</Button>
