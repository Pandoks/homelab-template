<script lang="ts">
  import authPlaceholderImage from '$lib/assets/auth-placeholder.svg';
  import SignupForm from './signup-form.svelte';

  let { data, form } = $props();

  let formInteracted = $state(false);
  $effect(() => {
    if (form) {
      formInteracted = false;
    }
  });
</script>

<div class="w-full h-screen lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">Sign Up</h1>
        <p class="text-balance text-muted-foreground">
          Enter your information to create an account
        </p>
        {#if form && !form.success && form.message && !formInteracted}
          <p class="text-balance text-red-600">{form.message}</p>
        {/if}
      </div>

      <SignupForm
        data={{ signupForm: data.signupForm, passkeyForm: data.signupPasskeyForm }}
        on:interacted={() => (formInteracted = true)}
      />

      <div class="text-center text-sm">
        Already have an account?
        <a href="/auth/login" class="underline"> Login </a>
      </div>
    </div>
  </div>
  <div class="hidden bg-muted lg:block">
    <img
      src={authPlaceholderImage}
      alt="placeholder"
      width="1920"
      height="1080"
      class="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
    />
  </div>
</div>
