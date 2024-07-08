<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import NewPasswordForm from './new-password-form.svelte';

  export let data: PageData;
  export let form: ActionData;
</script>

<div class="w-full h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-6">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">New Password</h1>
        <p class="text-balance text-muted-foreground">Enter your new password</p>
        {#if form && form.success}
          <p class="text-green-600">Password reset instructions sent to email!</p>
        {/if}
        {#if !data.success}
          <p class="text-balance text-red-600">{data.message}</p>
        {/if}
      </div>

      <NewPasswordForm data={data.newPasswordForm} disabled={!data.success} />
    </div>
  </div>
</div>
