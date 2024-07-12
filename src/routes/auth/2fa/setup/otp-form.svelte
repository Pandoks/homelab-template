<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { twoFactorSetupSchema, type TwoFactorSetupSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { Label } from '$lib/components/ui/label';
  import { zodClient } from 'sveltekit-superforms/adapters';

  export let data: SuperValidated<Infer<TwoFactorSetupSchema>>;

  const form = superForm(data, {
    validators: zodClient(twoFactorSetupSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-2" method="post" use:enhance action="?/verify-email-code">
  <Form.Field {form} name="otp">
    <Form.Control let:attrs>
      <Label>Verification Code</Label>
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
