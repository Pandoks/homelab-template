<script lang="ts">
  import { Button, type ButtonProps } from './index';

  let {
    class: className,
    variant = 'default',
    size = 'default',
    response = $bindable(),
    children,
    ...restProps
  }: ButtonProps & { response: Response } = $props();

  const handleSignOut = async () => {
    response = await fetch('/auth/logout', {
      method: 'POST'
    });
  };
</script>

<Button {variant} {size} class={className} onclick={handleSignOut} {...restProps}>
  {@render children?.()}
</Button>
