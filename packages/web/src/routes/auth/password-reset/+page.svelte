<script lang="ts">
  import PasswordResetForm from './password-reset-form.svelte';

  let { data, form } = $props();

  let formInteracted = $state(false);
  $effect(() => {
    if (form) {
      formInteracted = false;
    }
  });
</script>

<div class="w-full h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">Password Reset</h1>
        <p class="text-balance text-muted-foreground">Enter your email to reset your password</p>
        {#if form && form.success && !formInteracted}
          <p class="text-green-600">Password reset instructions sent to email!</p>
        {:else if form && !form.success && !formInteracted && form.throttled}
          <p class="text-balance text-red-600">Too Many Requests. Try Later.</p>
        {/if}
      </div>

      <PasswordResetForm
        on:interacted={() => (formInteracted = true)}
        data={data.passwordResetForm}
      />
    </div>
  </div>
</div>
