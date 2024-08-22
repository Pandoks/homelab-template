<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Props } from '.';

  type $$Props = Props;
  let className: $$Props['class'] = undefined;
  export let method: $$Props['method'] = 'POST';
  export let action: $$Props['action'] = undefined;
  export let duration: $$Props['duration'] = 60;
  export { className as class };

  let sent = false;
  let time = duration!;
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

<form {method} {action} class={className} {...$$restProps} use:enhance on:submit={handleSubmit}>
  {#if sent}
    {time}
  {:else}
    <button type="submit" class="underline">
      <slot />
    </button>
  {/if}
</form>
