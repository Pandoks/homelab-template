<script lang="ts">
  import { onMount } from 'svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import { enhance } from '$app/forms';
  import { CopySecret } from '$lib/components/ui/copy';
  import { CircleAlert, LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { errorShake } from '$lib/components/animation/function';

  let { data, form } = $props();

  let open = $state(false);
  let delayed = $state(false);
  let formTimeout: NodeJS.Timeout;

  $effect(() => {
    if (form) {
      clearTimeout(formTimeout);
      delayed = false;
      open = false;
    }
  });

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto flex flex-col w-[350px] items-center gap-14">
      <div class="grid gap-2 text-center -mb-1.5">
        <h1 class="text-3xl font-bold">2 Factor Authentication</h1>
        <p class="text-muted-foreground">Store the recovery code somewhere secure</p>
      </div>

      <div class="flex flex-col gap-1">
        {#if data.twoFactorRecoveryCode || form?.twoFactorRecoveryCode}
          {@render secret()}
        {:else}
          <div class="flex flex-col items-center gap-3 text-red-600">
            {#if mounted}
              <div in:errorShake={{ duration: 350, intensity: 15, frequency: 3 }}>
                <CircleAlert size={40} />
              </div>
            {/if}
            <p class="text-sm text-center">
              Uh oh! You no longer have access to your recovery code. We can only show it to you
              <strong>once</strong> for security.
            </p>
          </div>
          <form
            class="w-full"
            method="POST"
            onsubmit={() =>
              (formTimeout = setTimeout(() => {
                delayed = true;
              }, 500))}
            use:enhance
            action="?/generate-new"
          >
            <Button
              variant="outline"
              class="mt-11 px-4 py-9 flex flex-col text-sm font-normal text-wrap text-center"
              type="submit"
            >
              <p>
                Click here to generate a <strong>new</strong> recovery code.
                <i class="text-xs">Previous recovery codes will be invalidated.</i>
              </p>
            </Button>
          </form>
        {/if}
      </div>

      {#if data.twoFactorRecoveryCode || form?.twoFactorRecoveryCode}
        {@render alert()}
      {:else}
        {@render activate()}
      {/if}
    </div>
  </div>
</div>

{#snippet secret()}
  <div class="flex gap-1 text-yellow-600">
    <TriangleAlert size={16} />
    <p class="text-xs">Do not navigate/refresh until copied</p>
  </div>
  <CopySecret
    class="w-[310px]"
    size="xs"
    copy={data.twoFactorRecoveryCode ? data.twoFactorRecoveryCode : form?.twoFactorRecoveryCode}
  />
{/snippet}

{#snippet alert()}
  <AlertDialog.Root closeOnOutsideClick={true} bind:open>
    <AlertDialog.Trigger>
      <Button class="w-full mt-2" onclick={() => (open = true)}>
        Activate 2 Factor Authentication
      </Button>
    </AlertDialog.Trigger>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Did you store the recovery code?</AlertDialog.Title>
        <AlertDialog.Description>
          This is the only time you are going to have access to the recovery code. You will not be
          able to view it after you leave this page.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <form
            method="POST"
            onsubmit={() =>
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
{/snippet}

{#snippet activate()}
  <form
    class="w-full"
    method="POST"
    onsubmit={() =>
      (formTimeout = setTimeout(() => {
        delayed = true;
      }, 500))}
    use:enhance
    action="?/activate-2fa"
  >
    {#if delayed}
      <Button disabled class="w-full mt-2">
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Activating
      </Button>
    {:else}
      <Button class="w-full mt-2" type="submit">Activate 2 Factor Authentication</Button>
    {/if}
  </form>
  <div class="text-center text-sm -mt-10">Continue if you already have the recovery code</div>
{/snippet}
