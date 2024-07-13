<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { twoFactorSetupSchema, type TwoFactorSetupSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { CircleCheck } from '$lib/components/animation/circle-check';
  import { Button } from '$lib/components/ui/button';
  import { draw } from 'svelte/transition';

  export let data: SuperValidated<Infer<TwoFactorSetupSchema>>;
  export let success: boolean = false;

  const superFormFields = superForm(data, {
    validators: zodClient(twoFactorSetupSchema),
    multipleSubmits: 'prevent'
  });

  const { form: formData, enhance, delayed } = superFormFields;
</script>

<form class="grid gap-2" method="post" use:enhance action="?/verify-otp">
  <Form.Field form={superFormFields} name="otp">
    <Form.Control let:attrs>
      <Form.Label>Verification Code</Form.Label>
      <div class="flex w-full max-w-sm items-center space-x-3">
        <Input
          {...attrs}
          class="text-center"
          placeholder="XXXXXX"
          maxlength={6}
          bind:value={$formData.otp}
        />

        {#if $delayed}
          <Form.Button disabled variant="secondary" class="w-full">
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            Verifying
          </Form.Button>
        {:else}
          <Form.Button variant="secondary">
            {#if success}
              <CircleCheck on:introend={() => console.log('test')} />
            {:else}
              Verify
            {/if}
          </Form.Button>
        {/if}
      </div>
    </Form.Control>
  </Form.Field>
</form>

{#if $delayed}
  <Form.Button disabled class="w-full mt-4">
    <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
    Activating 2 Factor Authentication
  </Form.Button>
{:else if data.valid}
  <Form.Button class="mt-4">Activate 2 Factor Authentication</Form.Button>
{:else}
  <Form.Button disabled class="mt-4">Activate 2 Factor Authentication</Form.Button>
{/if}
