<script lang="ts">
  /**
   * TODO: Use input OTP when available on Shadcn-Svelte
   */
  import type { ActionData, PageData } from './$types';
  import VerificationForm from './verification-form.svelte';

  export let data: PageData;
  export let form: ActionData;
</script>

<div class="w-full h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">Email Verification</h1>
        <p class="text-balance text-muted-foreground">Enter your code to activate your account</p>
        {#if form && !form.success}
          <p class="text-balance text-red-600">{form.message}</p>
        {/if}
      </div>

      <VerificationForm data={data.emailVerificationForm} />
    </div>
  </div>
</div>
