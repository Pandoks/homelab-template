<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { signupSchema, type SignupSchema } from './schema';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';

  export let data: SuperValidated<Infer<SignupSchema>>;

  const form = superForm(data, {
    validators: zodClient(signupSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent',
    dataType: 'json'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-2" method="post" use:enhance action="?/login">
  <Form.Field {form} name="username">
    <Form.Control let:attrs>
      <Form.Label>Username</Form.Label>
      <Input {...attrs} bind:value={$formData.username} />
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="email">
    <Form.Control let:attrs>
      <Form.Label>Email</Form.Label>
      <Input {...attrs} bind:value={$formData.email} />
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="password">
    <Form.Control let:attrs>
      <div class="flex items-center">
        <Form.Label for="password">Password</Form.Label>
      </div>
      <Input {...attrs} bind:value={$formData.password} type="password" />
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  {#if $delayed}
    <Form.Button disabled class="w-full mt-4">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Signing Up
    </Form.Button>
  {:else}
    <Form.Button class="mt-4">Sign up</Form.Button>
  {/if}
</form>
