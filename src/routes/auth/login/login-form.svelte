<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { loginSchema, type LoginFormSchema } from './schema';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { Label } from '$lib/components/ui/label';
  import { LoaderCircle } from 'lucide-svelte';

  export let data: SuperValidated<Infer<LoginFormSchema>>;

  const form = superForm(data, {
    validators: zodClient(loginSchema),
    clearOnSubmit: 'none',
    multipleSubmits: 'prevent',
    dataType: 'json'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-4" method="post" use:enhance action="?/login">
  <Form.Field {form} name="usernameOrEmail" class="grid gap-2">
    <Form.Control let:attrs>
      <Label>Email/Username</Label>
      <Input {...attrs} bind:value={$formData.usernameOrEmail} />
    </Form.Control>
  </Form.Field>

  <Form.Field {form} name="password" class="grid gap-2">
    <Form.Control let:attrs>
      <div class="flex items-center">
        <Label for="password">Password</Label>
        <a href="/auth/password-reset" class="ml-auto inline-block text-sm underline">
          Forgot your password?
        </a>
      </div>
      <Input {...attrs} bind:value={$formData.password} type="password" />
    </Form.Control>
  </Form.Field>

  {#if $delayed}
    <Form.Button disabled class="w-full">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Logging In
    </Form.Button>
  {:else}
    <Form.Button>Login</Form.Button>
  {/if}
</form>
