<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type TwoFactorRecoverySchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let {
    data,
    interacted
  }: { data: SuperValidated<Infer<TwoFactorRecoverySchema>>; interacted: () => void } = $props();

  const superFormFields = superForm(data, {
    multipleSubmits: 'prevent',
    resetForm: false,
    onResult: () => {
      open = false;
    }
  });
  const { form: formData, enhance, delayed } = superFormFields;

  let open = $state(false);
</script>

<form id="recovery-form" class="grid gap-2" method="POST" use:enhance action="?/recover-2fa">
  <Form.Field form={superFormFields} name="recoveryCode">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Recovery Code</Form.Label>
        <Input oninput={interacted} {...props} bind:value={$formData.recoveryCode} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Dialog.Root bind:open>
    <Dialog.Trigger>
      <Button class="w-full mt-2" onclick={() => (open = true)}>Recover</Button>
    </Dialog.Trigger>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>2FA will be disabled</Dialog.Title>
        <Dialog.Description>
          2 factor authentication will be disabled on your account after you recover your account.
          You can reactivate 2FA in your profile settings.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer class="gap-y-2 gap-x-2">
        <Dialog.Close><Button variant="secondary" class="w-full">Cancel</Button></Dialog.Close>
        {#if $delayed}
          <Form.Button disabled>
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            Recovering
          </Form.Button>
        {:else}
          <Form.Button form="recovery-form" type="submit">Recover</Form.Button>
        {/if}
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</form>
