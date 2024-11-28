<script lang="ts">
  import RecoveryForm from './recovery-form.svelte';

  let { data, form } = $props();

  let formInteracted = $state(false);
  $effect(() => {
    if (form) {
      formInteracted = false;
    }
  });
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">2 Factor Recovery</h1>
        <p class="text-balance text-muted-foreground">Enter your recovery code</p>
        {#if form && !form.success && !formInteracted}
          {#if form.throttled}
            <p class="text-balance text-red-600">Too Many Attempts. Try Later.</p>
          {:else}
            <p class="text-balance text-red-600">Invalid Code</p>
          {/if}
        {/if}
      </div>

      <RecoveryForm interacted={() => (formInteracted = true)} data={data.recoveryForm} />
    </div>
  </div>
</div>
