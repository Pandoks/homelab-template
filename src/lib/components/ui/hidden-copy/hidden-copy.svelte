<script lang="ts">
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { createEventDispatcher } from 'svelte';
  import { clickToCopyAction } from 'svelte-legos';
  import { Check, Eye, EyeOff } from 'lucide-svelte';

  export let text: string;
  export let hideDuration: number = 10000; // 10 seconds
  export let copyFeedbackDuration: number = 2000; // 2 seconds

  let isRevealed = false;
  let isCopied = false;
  let hideTimeout: NodeJS.Timeout;
  let copyFeedbackTimeout: NodeJS.Timeout;

  const dispatch = createEventDispatcher();

  function toggleReveal() {
    isRevealed = !isRevealed;
    if (isRevealed) {
      resetHideTimeout();
    } else {
      clearTimeout(hideTimeout);
    }
  }

  function handleCopy() {
    clickToCopyAction(text);
    isCopied = true;
    dispatch('copy', { text });
    resetCopyFeedbackTimeout();
    resetHideTimeout();
  }

  function resetHideTimeout() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      isRevealed = false;
    }, hideDuration);
  }

  function resetCopyFeedbackTimeout() {
    clearTimeout(copyFeedbackTimeout);
    copyFeedbackTimeout = setTimeout(() => {
      isCopied = false;
    }, copyFeedbackDuration);
  }

  $: hiddenText = text.replace(/./g, '*');
</script>

<div class="relative inline-flex items-center space-x-2 font-mono bg-gray-100 p-2 rounded">
  <div class="cursor-pointer" on:click={handleCopy}>
    {#if isRevealed}
      <span transition:fade={{ duration: 300, easing: cubicOut }}>{text}</span>
    {:else}
      <span>{hiddenText}</span>
    {/if}
  </div>

  <button
    on:click={toggleReveal}
    class="focus:outline-none"
    aria-label={isRevealed ? 'Hide text' : 'Reveal text'}
  >
    {#if isCopied}
      <Check size={20} class="text-green-500" />
    {:else if isRevealed}
      <EyeOff size={20} />
    {:else}
      <Eye size={20} />
    {/if}
  </button>

  {#if isCopied}
    <div
      class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded"
      transition:fade={{ duration: 200 }}
    >
      Copied!
    </div>
  {/if}
</div>
