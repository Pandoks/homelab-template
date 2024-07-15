<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { twoFactorSetupSchema, type TwoFactorSetupSchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { CircleX, LoaderCircle } from 'lucide-svelte';
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

  import { spring } from 'svelte/motion';
  import { fly } from 'svelte/transition';

  export let text = 'Submit';
  export let isError = false;

  let shakeSpring = spring(
    { x: 0 },
    {
      stiffness: 0.3,
      damping: 0.2
    }
  );

  $: if (isError) {
    shake();
  }

  function shake() {
    shakeSpring.set({ x: 10 });
    setTimeout(() => shakeSpring.set({ x: -10 }), 50);
    setTimeout(() => shakeSpring.set({ x: 10 }), 100);
    setTimeout(() => shakeSpring.set({ x: -10 }), 150);
    setTimeout(() => shakeSpring.set({ x: 0 }), 200);
  }
</script>

<button
  style="transform: translateX({$shakeSpring.x}px)"
  class="py-2 px-4 text-base cursor-pointer border-none rounded transition-colors duration-300 {isError
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-green-500 hover:bg-green-600'} text-white"
  on:click={() => (isError = true)}
>
  {#if isError}
    <span in:fly={{ y: -20, duration: 300 }}>Error!</span>
  {:else}
    {text}
  {/if}
</button>

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
          <CircleX
            slot="fail"
            class="stroke-red-600"
            let:handleIntroEnd
            on:introend={handleIntroEnd}
          />
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
