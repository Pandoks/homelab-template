<script lang="ts">
  /**
   * TODO: Use input OTP when available on Shadcn-Svelte
   */
  import LinkCountdown from '$lib/components/ui/link-countdown/link-countdown.svelte';
  import type { ActionData, PageData } from './$types';
  import VerificationForm from './verification-form.svelte';
  import { errorShake } from '$lib/components/animation/function';

  export let data: PageData;
  export let form: ActionData;

  $: handleFormUpdate(form);

  const handleFormUpdate = (form: ActionData) => {
    if (!form) {
      return;
    }
    formInteracted = false;
    resendLimited = form.limited || false;
    if (resendLimited) {
      clearTimeout(resendTimeout);
      resendTimeout = setTimeout(() => {
        resendLimited = false;
      }, 5000); // get rid of limit errors after 5 seconds
    }
  };

  let formInteracted = false;
  let resendLimited = false;
  let resendTimeout: NodeJS.Timeout;
</script>

<div class="w-full h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">Email Verification</h1>
        <p class="text-balance text-muted-foreground">Enter your code to activate your account</p>
        {#if form && !form.success && !formInteracted && !form.limited}
          <p class="text-balance text-red-600">{form.message}</p>
        {/if}
      </div>

      <VerificationForm
        on:interacted={() => (formInteracted = true)}
        data={data.emailVerificationForm}
      />

      <div class="text-center text-sm justify-center flex flex-row gap-1">
        {#if resendLimited}
          <p in:errorShake={{ duration: 400, intensity: 15, frequency: 3 }} class="text-red-600">
            Too many requests. Try later.
          </p>
        {:else}
          <p>Didn&apos;t get a code?</p>
          <LinkCountdown method="POST" action="?/resend">Resend</LinkCountdown>
        {/if}
      </div>
    </div>
  </div>
</div>
