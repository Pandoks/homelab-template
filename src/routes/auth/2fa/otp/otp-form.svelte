<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type OneTimePasswordSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';

  export let data: SuperValidated<Infer<OneTimePasswordSchema>>;

  const superFormFields = superForm(data, {
    multipleSubmits: 'prevent',
    resetForm: false
  });

  const { form: formData, enhance, delayed } = superFormFields;
</script>

<form class="grid gap-2" method="POST" use:enhance action="?/verify-otp">
  <Form.Field form={superFormFields} name="otp">
    <Form.Control let:attrs>
      <Form.Label>2FA Code</Form.Label>
      <Input
        {...attrs}
        class="text-center"
        placeholder="XXXXXX"
        maxlength={6}
        bind:value={$formData.otp}
      />
    </Form.Control>
  </Form.Field>

  {#if $delayed}
    <Form.Button disabled class="w-full mt-4">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Verifying
    </Form.Button>
  {:else}
    <Form.Button class="mt-4">Verify</Form.Button>
  {/if}
</form>
