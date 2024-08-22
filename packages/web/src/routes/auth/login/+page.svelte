<script lang="ts">
  import authPlaceholderImage from '$lib/assets/auth-placeholder.svg';
  import type { ActionData, PageData } from './$types';
  import LoginForm from './login-form.svelte';

  export let data: PageData;
  export let form: ActionData;

  $: if (form) {
    formInteracted = false;
  }

  let formInteracted = false;
</script>

<div class="w-full h-screen lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">Login</h1>
        <p class="text-balance text-muted-foreground">
          Enter your credentials to login to your account
        </p>
        {#if form && !form.success && !formInteracted}
          {#if form.throttled}
            <p class="text-balance text-red-600">Too Many Attempts. Try Later.</p>
          {:else}
            <p class="text-balance text-red-600">Invalid Credentials</p>
          {/if}
        {/if}
      </div>

      <LoginForm
        data={{ loginForm: data.loginForm, passkeyForm: data.loginPasskeyForm }}
        on:interacted={() => (formInteracted = true)}
      />

      <div class="text-center text-sm">
        Don&apos;t have an account?
        <a href="/auth/signup" class="underline"> Sign up </a>
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
