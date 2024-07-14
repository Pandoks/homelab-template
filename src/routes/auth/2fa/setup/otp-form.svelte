<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { twoFactorSetupSchema, type TwoFactorSetupSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { LoaderCircle } from 'lucide-svelte';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { CircleCheck } from '$lib/components/animation/circle-check';
  import { fade, fly } from 'svelte/transition';

  export let data: SuperValidated<Infer<TwoFactorSetupSchema>>;
  export let verified: boolean = false;

  let showCheckmark = false;
  let showVerify = true;

  $: if (verified) {
    showCheckmark = true;
    showVerify = false;
  }

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

        {#if $delayed}
          <Form.Button disabled variant="secondary" class="w-full">
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            Verifying
          </Form.Button>
        {:else}
          <Form.Button variant="secondary" class="w-24 overflow-hidden">
            {#if showCheckmark}
              <div out:fly={{ duration: 400, y: 30 }} on:outroend={() => (showVerify = true)}>
                <CircleCheck
                  on:introend={() =>
                    setTimeout(() => {
                      showCheckmark = false;
                    }, 2000)}
                  class="stroke-green-600"
                />
              </div>
            {:else if showVerify}
              <!-- won't render on first mount. will only animate after click -->
              <p in:fade={{ duration: 400 }}>Verify</p>
            {/if}
          </Form.Button>
        {/if}
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
