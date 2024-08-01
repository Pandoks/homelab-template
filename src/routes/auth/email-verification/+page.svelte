<script lang="ts">
  /**
   * TODO: Use input OTP when available on Shadcn-Svelte
   */
  import LinkCountdown from '$lib/components/ui/link-countdown/link-countdown.svelte';
  import type { ActionData, PageData } from './$types';
  import VerificationForm from './verification-form.svelte';

  export let data: PageData;
  export let form: ActionData;

  $: if (form) {
    formInteracted = false;
    resendLimited = form.limited || false;
    if (resendLimited) {
      clearTimeout(resendTimeout);
      resendTimeout = setTimeout(() => {
        resendLimited = false;
      }, 25000); // get rid of limit errors after 25 seconds
    }
  }

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
        {#if form && !form.success && !formInteracted}
          <p class="text-balance text-red-600">{form.message}</p>
        {/if}
      </div>

      <VerificationForm
        on:interacted={() => (formInteracted = true)}
        data={data.emailVerificationForm}
      />

      <div>
        {#if form && form.limited}
          <p class="text-red-600">Too many requests. Try later.</p>
        {:else}
          Didn&apos;t get a code?
          <LinkCountdown class="text-center text-sm" method="POST" action="?/resend">
            Resend
          </LinkCountdown>
        {/if}
      </div>
    </div>
  </div>
</div>
