<script lang="ts">
  import { enhance } from '$app/forms';
  import type { WithElementRef } from 'bits-ui';
  import type { HTMLFormAttributes } from 'svelte/elements';

  export type LinkCountdownProps = WithElementRef<HTMLFormAttributes> & {
    duration?: number;
  };

  let {
    class: className,
    method = 'POST',
    duration = $bindable(60),
    children,
    ...restProps
  }: LinkCountdownProps = $props();

  let sent = $state(false);
  let time = $state(duration);

  let intervalId: NodeJS.Timeout;
  const handleSubmit = () => {
    sent = true;
    intervalId = setInterval(() => {
      if (time > 0) {
        time--;
      } else {
        if (intervalId) {
          clearInterval(intervalId);
        }
        sent = false;
        time = duration!;
      }
    }, 1000);
  };
</script>

<form {method} class={className} {...restProps} use:enhance onsubmit={handleSubmit}>
  {#if sent}
    {time}
  {:else}
    <button type="submit" class="underline">
      {@render children?.()}
    </button>
  {/if}
</form>
