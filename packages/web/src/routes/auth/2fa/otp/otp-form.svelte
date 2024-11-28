<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type OneTimePasswordSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';

  let {
    data,
    interacted
  }: { data: SuperValidated<Infer<OneTimePasswordSchema>>; interacted: () => void } = $props();

  const superFormFields = superForm(data, {
    multipleSubmits: 'prevent',
    resetForm: false
  });

  const { form: formData, enhance, delayed } = superFormFields;
</script>

<form class="grid gap-2" method="POST" use:enhance action="?/verify-otp">
  <Form.Field form={superFormFields} name="otp">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>2FA Code</Form.Label>
        <Input
          oninput={() => interacted}
          {...props}
          class="text-center"
          placeholder="XXXXXX"
          maxlength={6}
          bind:value={$formData.otp}
        />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <Form.Button disabled={$delayed} class="mt-4">
    {#if $delayed}
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Verifying
    {:else}
      Verify
    {/if}</Form.Button
  >
</form>
