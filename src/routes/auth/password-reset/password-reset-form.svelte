<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { Label } from '$lib/components/ui/label';
  import { LoaderCircle } from 'lucide-svelte';
  import { passwordResetSchema, type PasswordResetSchema } from './schema';

  export let data: SuperValidated<Infer<PasswordResetSchema>>;

  const form = superForm(data, {
    validators: zodClient(passwordResetSchema),
    clearOnSubmit: 'errors-and-message',
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-4" method="post" use:enhance action="?/login">
  <Form.Field {form} name="email" class="grid gap-2">
    <Form.Control let:attrs>
      <Label>Email</Label>
      <Input {...attrs} bind:value={$formData.email} />
    </Form.Control>
  </Form.Field>

  {#if $delayed}
    <Form.Button disabled class="w-full mt-4">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Logging In
    </Form.Button>
  {:else}
    <Form.Button class="mt-4">Login</Form.Button>
  {/if}
</form>
