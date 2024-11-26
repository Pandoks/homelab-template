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
  import { BooleanButton } from '$lib/components/animation/ui/button';
  import type { ActionData } from './$types';

  let { data, form }: { data: SuperValidated<Infer<TwoFactorSetupSchema>>; form: ActionData } =
    $props();

  let animatedButton: BooleanButton;
  let successElement: CircleCheck;
  const verified = $derived(form ? form.success : false);
  const fail = $derived(form ? form.success : false);

  const superFormFields = superForm(data, {
    validators: zodClient(twoFactorSetupSchema),
    multipleSubmits: 'abort',
    resetForm: false,
    invalidateAll: false,
    onResult: async (event) => {
      await animatedButton.reset();
      if (event.result.type === 'success') {
        // needed because animation needs to restart when spamming
        await successElement?.restart();
      }
    }
  });

  const { form: formData, enhance, delayed } = superFormFields;
</script>

<form class="grid gap-2" method="POST" use:enhance action="?/verify-otp">
  <Form.Field form={superFormFields} name="otp">
    <Form.Control>
      {#snippet children({ props })}
        {#if verified}
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

          <BooleanButton
            type="submit"
            variant="secondary"
            class="w-24"
            loading={$delayed}
            success={verified}
            {fail}
            bind:this={animatedButton}
            failDuration={1000}
          >
            {#snippet loadingSnippet()}
              <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            {/snippet}
            {#snippet failSnippet()}
              <CircleX class="stroke-red-600" />
            {/snippet}
            {#snippet successSnippet()}
              <CircleCheck slot="success" class="stroke-green-600" bind:this={successElement} />
            {/snippet}
            <p>Verify</p>
          </BooleanButton>
        </div>
      {/snippet}
    </Form.Control>
  </Form.Field>
</form>
