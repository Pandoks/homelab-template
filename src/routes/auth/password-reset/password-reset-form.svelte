<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { passwordResetSchema, type PasswordResetSchema } from './schema';

  export let data: SuperValidated<Infer<PasswordResetSchema>>;

  const form = superForm(data, {
    validators: zodClient(passwordResetSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-4" method="POST" use:enhance action="?/password-reset">
  <Form.Field {form} name="email" class="grid gap-2">
    <Form.Control let:attrs>
      <Form.Label>Email</Form.Label>
      <Input {...attrs} bind:value={$formData.email} />
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  {#if $delayed}
    <Form.Button disabled class="w-full">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Submitting
    </Form.Button>
  {:else}
    <Form.Button>Submit</Form.Button>
  {/if}
</form>
