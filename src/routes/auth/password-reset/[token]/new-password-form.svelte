<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { newPasswordSchema, type NewPasswordSchema } from './schema';

  export let data: SuperValidated<Infer<NewPasswordSchema>>;
  export let disabled: boolean = false;

  const form = superForm(data, {
    validators: zodClient(newPasswordSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-4" method="POST" use:enhance action="?/password-reset">
  <Form.Field {form} name="password">
    <Form.Control let:attrs>
      <Form.Label>Password</Form.Label>
      <Input {...attrs} type="password" bind:value={$formData.password} />
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="passwordConfirmation">
    <Form.Control let:attrs>
      <Form.Label>Confirm Password</Form.Label>
      <Input {...attrs} type="password" bind:value={$formData.passwordConfirmation} />
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  {#if disabled}
    <Form.Button disabled>Submit</Form.Button>
  {:else if $delayed}
    <Form.Button disabled class="w-full">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Submitting
    </Form.Button>
  {:else}
    <Form.Button>Submit</Form.Button>
  {/if}
</form>
