<script lang="ts">
  /**
   * TODO: Use input OTP when available on Shadcn-Svelte
   */
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { twoFactorSetupSchema, type TwoFactorSetupSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { CircleX, LoaderCircle } from 'lucide-svelte';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { CircleCheck } from '$lib/components/animation/icon';
  import type { ActionData } from './$types';
  import { Button } from '$lib/components/ui/button';
  import { errorShake } from '$lib/components/animation/function';
  import { fly } from 'svelte/transition';

  let { data, form }: { data: SuperValidated<Infer<TwoFactorSetupSchema>>; form: ActionData } =
    $props();

  const superFormFields = superForm(data, {
    validators: zodClient(twoFactorSetupSchema),
    multipleSubmits: 'abort',
    resetForm: false,
    invalidateAll: false,
    onResult: ({ result: { type } }) => {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        show = false;
      }, 1500);

      condition = type === 'success' ? 'success' : 'fail';
      show = true;
    }
  });

  const { form: formData, enhance, delayed } = superFormFields;

  let show = $state(false);
  let condition = $state<'none' | 'success' | 'fail'>('none');
  let clickTimeout: NodeJS.Timeout;
</script>

<form class="grid gap-2" method="POST" use:enhance action="?/verify-otp">
  <Form.Field form={superFormFields} name="otp">
    <Form.Control>
      {#snippet children({ props })}
        {#if form?.success}
          <Form.Label class="text-green-600">Verification Code</Form.Label>
        {:else}
          <Form.Label>Verification Code</Form.Label>
        {/if}
        <div class="flex w-full max-w-sm items-center space-x-3">
          <Input
            {...props}
            class="text-center"
            placeholder="XXXXXX"
            maxlength={6}
            bind:value={$formData.otp}
          />

          {@render booleanButton()}
        </div>
      {/snippet}
    </Form.Control>
  </Form.Field>
</form>

{#snippet booleanButton()}
  <Button disabled={$delayed} class="w-24 overflow-hidden" variant="secondary" type="submit">
    {#if $delayed}
      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
    {:else if condition === 'none'}
      Verify
    {:else if show}
      <div
        out:fly={{ duration: 300, y: 30 }}
        onoutroend={() => {
          condition = 'none';
        }}
      >
        {#if condition === 'success'}
          <CircleCheck class="stroke-green-600" />
        {:else if condition === 'fail'}
          <div in:errorShake|global>
            <CircleX class="stroke-red-600" />
          </div>
        {/if}
      </div>
    {/if}
  </Button>
{/snippet}
