<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type VerificationSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';

  export let data: SuperValidated<Infer<VerificationSchema>>;

  const form = superForm(data, {
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = form;
  $: $formData.code = $formData.code.replaceAll(' ', '');

  const dispatch = createEventDispatcher();
</script>

<form class="grid gap-2" method="POST" use:enhance action="?/verify-email-code">
  <Form.Field {form} name="code">
    <Form.Control let:attrs>
      <Form.Label>Verification Code</Form.Label>
      <Input
        on:input={() => dispatch('interacted')}
        {...attrs}
        class="text-center"
        bind:value={$formData.code}
      />
    </Form.Control>
  </Form.Field>

  {#if $delayed}
    <Form.Button disabled class="w-full mt-4">
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
      Activating
    </Form.Button>
  {:else}
    <Form.Button class="mt-4">Activate</Form.Button>
  {/if}
</form>
