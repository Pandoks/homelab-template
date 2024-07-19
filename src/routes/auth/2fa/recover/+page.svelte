<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import RecoveryForm from './recovery-form.svelte';

  export let data: PageData;
  export let form: ActionData;
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">2 Factor Recovery</h1>
        <p class="text-balance text-muted-foreground">Enter your recovery code</p>
        {#if form && !form.success}
          <p class="text-balance text-red-600">Invalid Code</p>
        {/if}
      </div>

      <RecoveryForm data={data.recoveryForm} />
    </div>
  </div>
</div>
