<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { newPasswordSchema, type NewPasswordSchema } from './schema';

  let {
    data,
    disabled = false,
    interacted
  }: {
    data: SuperValidated<Infer<NewPasswordSchema>>;
    disabled: boolean;
    interacted: () => void;
  } = $props();

  const form = superForm(data, {
    validators: zodClient(newPasswordSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-4" method="POST" use:enhance action="?/new-password">
  <Form.Field {form} name="password">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Password</Form.Label>
        <Input
          oninput={() => interacted?.()}
          {...props}
          type="password"
          autocomplete="on"
          bind:value={$formData.password}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field {form} name="passwordConfirmation">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Confirm Password</Form.Label>
        <Input
          oninput={() => interacted?.()}
          {...props}
          type="password"
          autocomplete="on"
          bind:value={$formData.passwordConfirmation}
        />
      {/snippet}
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
