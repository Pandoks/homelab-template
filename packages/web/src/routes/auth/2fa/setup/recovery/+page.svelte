<script lang="ts">
  import { onMount } from 'svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { enhance } from '$app/forms';
  import { CopySecret } from '$lib/components/ui/copy';
  import { CircleAlert, LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { errorShake } from '$lib/components/animation/function';

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  let { data, form } = $props();

  let open = $state(false);
  let delayed = $state(false);
  let firstTime = $derived(data.twoFactorRecoveryCode || form?.twoFactorRecoveryCode);
  let formTimeout: NodeJS.Timeout;

  $effect(() => {
    if (form) {
      clearTimeout(formTimeout);
      delayed = false;
      open = false;
    }
  });
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto flex flex-col w-[340px] items-center">
      <div class="grid gap-2 text-center pb-10">
        <h1 class="text-3xl font-bold">2 Factor Authentication</h1>
        <p class="text-muted-foreground">Store the recovery code somewhere secure</p>
      </div>

      <div class="flex flex-col">
        {#if firstTime}
          <div class="pb-14">{@render secret()}</div>
        {:else}
          <div class="flex flex-col items-center gap-5 text-red-600">
            {#if mounted}
              <div in:errorShake={{ duration: 350, intensity: 15, frequency: 3 }}>
                <CircleAlert size={40} />
              </div>
            {:else}
              <CircleAlert size={40} />
            {/if}
            <p class="text-sm text-center">
              Uh oh! You no longer have access to your recovery code. We can only show it to you
              <strong>once</strong> for security.
            </p>
          </div>
          <form
            class="w-full pt-5 pb-12"
            method="POST"
            onsubmit={() =>
              (formTimeout = setTimeout(() => {
                delayed = true;
              }, 500))}
            use:enhance
            action="?/generate-new"
          >
            <Button
              disabled={delayed}
              variant="outline"
              class="px-4 py-9 flex flex-col text-sm font-normal text-wrap text-center"
              type="submit"
            >
              {#if delayed}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                Generating
              {:else}
                <p>
                  Click here to generate a <strong>new</strong> recovery code.
                  <i class="text-xs">Previous recovery codes will be invalidated.</i>
                </p>
              {/if}
            </Button>
          </form>
        {/if}
      </div>

      {#if firstTime}
        {@render alert(
          'This is the only time you are going to have access to the recovery code. You will not be able to view it after you leave this page.'
        )}
      {:else}
        {@render alert(
          "If you have not saved your recovery code and you don't have access to it anymore, generate a new one"
        )}
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

{#snippet alert(description: string)}
  <Dialog.Root bind:open>
    <Dialog.Trigger class="w-full">
      <Button class="w-full">Activate 2 Factor Authentication</Button>
    </Dialog.Trigger>
    <Dialog.Content interactOutsideBehavior="close">
      <Dialog.Header>
        <Dialog.Title>Did you store the recovery code?</Dialog.Title>
        <Dialog.Description>
          {description}
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="gap-y-2 gap-x-2">
        <Dialog.Close><Button variant="secondary" class="w-full">Cancel</Button></Dialog.Close>
        <form
          method="POST"
          onsubmit={() =>
            (formTimeout = setTimeout(() => {
              delayed = true;
            }, 500))}
          use:enhance
          action="?/activate-2fa"
        >
          <Button type="submit" disabled={delayed} class="w-full">
            {#if delayed}
              <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              Activating
            {:else}
              Activate
            {/if}
          </Button>
        </form>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/snippet}
