<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { twoFactorSetupSchema, type TwoFactorSetupSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { CircleCheck } from '$lib/components/animation/icon';
  import { Button } from '$lib/components/animation/ui/button';
  import type { ActionData } from './$types';

  export let data: SuperValidated<Infer<TwoFactorSetupSchema>>;
  export let form: ActionData;

  $: verified = form ? form.success : false;
  $: fail = form ? !form.success : false;

  const superFormFields = superForm(data, {
    validators: zodClient(twoFactorSetupSchema),
    multipleSubmits: 'prevent',
    invalidateAll: false
  });

  const { form: formData, enhance, delayed } = superFormFields;
</script>

<form class="grid gap-2" method="post" use:enhance action="?/verify-otp">
  <Form.Field form={superFormFields} name="otp">
    <Form.Control let:attrs>
      {#if verified}
        <Form.Label class="text-green-600">Verification Code</Form.Label>
      {:else}
        <Form.Label>Verification Code</Form.Label>
      {/if}
      <div class="flex w-full max-w-sm items-center space-x-3">
        <Input
          {...attrs}
          class="text-center"
          placeholder="XXXXXX"
          maxlength={6}
          bind:value={$formData.otp}
        />

        <Button
          type="submit"
          variant="secondary"
          class="w-24"
          loading={$delayed}
          success={verified}
          {fail}
        >
          <svelte:fragment slot="loading">
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            Verifying
          </svelte:fragment>
          <CircleCheck
            slot="success"
            class="stroke-green-600"
            let:handleIntroEnd
            on:introend={handleIntroEnd}
          />
          <p>Verify</p>
        </Button>
      </div>
    </Form.Control>
  </Form.Field>

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
</form>
