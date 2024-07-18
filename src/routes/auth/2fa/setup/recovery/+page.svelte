<script lang="ts">
  import { onMount } from 'svelte';
  import type { ActionData, PageData } from './$types';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import { enhance } from '$app/forms';
  import { CopySecret } from '$lib/components/ui/copy';
  import { LoaderCircle } from 'lucide-svelte';

  export let data: PageData;
  export let form: ActionData;

  onMount(() => {
    const alert = () => '';
    window.addEventListener('beforeunload', alert);
    return () => {
      window.removeEventListener('beforeunload', alert);
    };
  });

  let open = false;
  let delayed = false;
  let formTimeout: NodeJS.Timeout;
  $: if (form) {
    delayed = false;
    open = false;
  }
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto flex flex-col w-[350px] items-center gap-16">
      <div class="grid gap-2 text-center -mb-1.5">
        <h1 class="text-3xl font-bold">2 Factor Authentication</h1>
        <p class="text-muted-foreground">Store the recovery code somewhere secure</p>
        {#if form && !form.success}
          <p class="text-balance text-red-600">Error Contact Support</p>
        {/if}
      </div>

      <CopySecret class="w-[310px]" size="xs" copy={data.twoFactorRecoveryCode} />

      <AlertDialog.Root closeOnOutsideClick={true} bind:open>
        <AlertDialog.Trigger asChild>
          <Button class="w-full" on:click={() => (open = true)}
            >Activate 2 Factor Authentication</Button
          >
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Did you store the recovery code?</AlertDialog.Title>
            <AlertDialog.Description>
              This is the only time you are going to have access to the recovery code. You will not
              be able to view it after you leave this page.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action asChild={true}>
              <form
                method="post"
                on:submit={() =>
                  (formTimeout = setTimeout(() => {
                    delayed = true;
                  }, 500))}
                use:enhance
                action="?/activate-2fa"
              >
                {#if delayed}
                  <Button disabled class="w-full">
                    <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                    Activating
                  </Button>
                {:else}
                  <Button type="submit" class="w-full">Activate</Button>
                {/if}
              </form>
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  </div>
</div>
