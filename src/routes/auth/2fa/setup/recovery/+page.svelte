<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';

  export let data: PageData;

  onMount(() => {
    window.addEventListener('beforeunload', () => console.log('test'));

    return () => {
      window.removeEventListener('beforeunload', () => console.log('test'));
    };
  });
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-3">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">2 Factor Authentication</h1>
        <p class="text-muted-foreground">Store the recovery code somewhere secure</p>
      </div>

      <AlertDialog.Root>
        <AlertDialog.Trigger asChild let:builder>
          <Button builders={[builder]}>Activate 2 Factor Authentication</Button>
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
            <AlertDialog.Action>Activate</AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  </div>
</div>
