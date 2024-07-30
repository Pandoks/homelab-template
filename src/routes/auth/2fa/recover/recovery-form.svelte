<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type TwoFactorRecoverySchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { Button } from '$lib/components/ui/button';
  import { createEventDispatcher } from 'svelte';

  export let data: SuperValidated<Infer<TwoFactorRecoverySchema>>;

  const superFormFields = superForm(data, {
    multipleSubmits: 'prevent',
    resetForm: false,
    onResult: () => {
      open = false;
    }
  });

  const { form: formData, enhance, delayed } = superFormFields;

  let open = false;

  const dispatch = createEventDispatcher();
</script>

<form id="recovery-form" class="grid gap-2" method="POST" use:enhance action="?/recover-2fa">
  <Form.Field form={superFormFields} name="recoveryCode">
    <Form.Control let:attrs>
      <Form.Label>Recovery Code</Form.Label>
      <Input
        on:input={() => dispatch('interacted')}
        {...attrs}
        bind:value={$formData.recoveryCode}
      />
    </Form.Control>
  </Form.Field>

  <AlertDialog.Root bind:open>
    <AlertDialog.Trigger asChild>
      <Button class="w-full mt-2" on:click={() => (open = true)}>Recover</Button>
    </AlertDialog.Trigger>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>2FA will be disabled</AlertDialog.Title>
        <AlertDialog.Description>
          2 factor authentication will be disabled on your account after you recover your account.
          You can reactivate 2FA in your profile settings.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          {#if $delayed}
            <Form.Button disabled>
              <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              Recovering
            </Form.Button>
          {:else}
            <Form.Button form="recovery-form" type="submit">Recover</Form.Button>
          {/if}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
</form>
