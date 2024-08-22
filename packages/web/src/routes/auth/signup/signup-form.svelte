<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import {
    signupPasskeySchema,
    signupSchema,
    type SignupPasskeySchema,
    type SignupSchema
  } from './schema';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input, ToggleInput } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { Fingerprint, LoaderCircle } from 'lucide-svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { slide } from 'svelte/transition';
  import { Button } from '$lib/components/ui/button';
  import { registerPasskey } from '$lib/auth/passkey';
  import { createEventDispatcher, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { z } from 'zod';
  import { emailSchema, usernameSchema } from '../schema';

  // TODO: add show and hide password

  export let data: {
    signupForm: SuperValidated<Infer<SignupSchema>>;
    passkeyForm: SuperValidated<Infer<SignupPasskeySchema>>;
  };
  let type: 'password' | 'passkey' = 'password';

  const signupForm = superForm(data.signupForm, {
    validators: zodClient(signupSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });
  const passkeyForm = superForm(data.passkeyForm, {
    validators: zodClient(signupPasskeySchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent',
    onSubmit: async (form) => {
      const data = form.formData;
      const username = data.get('username') as string;
      const email = data.get('email');
      const validator = z.object({ username: usernameSchema, email: emailSchema });
      if (!validator.safeParse({ username, email }).success) {
        form.cancel();
        return;
      }

      try {
        const { challengeId, clientDataJSON, attestationObject } = await registerPasskey({
          username: username,
          name: username
        });
        data.set('challengeId', challengeId);
        data.set('clientDataJSON', clientDataJSON);
        data.set('attestationObject', attestationObject);
      } catch {
        // TODO: delete the passkey (wait for https://github.com/w3c/webauthn/pull/2093)
        return;
      }
    }
  });
  const { form: signupFormData, enhance: signupEnhance, delayed: signupDelayed } = signupForm;
  const {
    form: passkeyFormData,
    enhance: passkeyEnhance,
    delayed: passkeyDelayedForm
  } = passkeyForm;

  $: passkeyDelayed = $passkeyDelayedForm;

  $: if (type === 'password') {
    $passkeyFormData.username = $signupFormData.username;
    $passkeyFormData.email = $signupFormData.email;

    let errors: { username?: string[]; email?: string[] } = {};
    const signupErrors = get(signupForm.errors);
    if ($passkeyFormData.username) {
      errors.username = signupErrors.username;
    }
    if ($passkeyFormData.email) {
      errors.email = signupErrors.email;
    }

    passkeyForm.errors.set(errors);
  } else {
    $signupFormData.username = $passkeyFormData.username;
    $signupFormData.email = $passkeyFormData.email;

    let errors: { username?: string[]; email?: string[]; password?: string[] } = {};
    const passkeyErrors = get(passkeyForm.errors);
    if ($signupFormData.username) {
      errors.username = passkeyErrors.username;
    }
    if ($signupFormData.email) {
      errors.email = passkeyErrors.email;
    }

    signupForm.errors.set(errors);
  }

  let transitionComplete = false;
  let passwordFormSwitching = false; // only used for password signup because of transition

  const swapLoginType = async () => {
    transitionComplete = false;
    passwordFormSwitching = true;

    await tick();

    type = type === 'password' ? 'passkey' : 'password';
    passwordFormSwitching = false;
  };

  const dispatch = createEventDispatcher();
</script>

{#if type === 'password'}
  <form class="flex flex-col" method="POST" use:signupEnhance action="?/signup">
    <Form.Field form={signupForm} name="username">
      <Form.Control let:attrs>
        <Form.Label>Username</Form.Label>
        <Input
          on:input={() => dispatch('interacted')}
          {...attrs}
          bind:value={$signupFormData.username}
        />
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field form={signupForm} name="email" class="mt-1">
      <Form.Control let:attrs>
        <Form.Label>Email</Form.Label>
        <Input
          on:input={() => dispatch('interacted')}
          {...attrs}
          bind:value={$signupFormData.email}
        />
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <div
      transition:slide|local={{ duration: 250 }}
      on:outroend={() => {
        transitionComplete = true;
        passwordFormSwitching = false;
      }}
      class="mt-2"
    >
      <Form.Field form={signupForm} name="password">
        <Form.Control let:attrs>
          <div class="flex items-center">
            <Form.Label for="password">Password</Form.Label>
          </div>
          <ToggleInput
            on:input={() => dispatch('interacted')}
            {...attrs}
            bind:value={$signupFormData.password}
            autocomplete="on"
            type="password"
          />
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>
    </div>

    <Form.Button disabled={$signupDelayed} class="w-full mt-4">
      {#if $signupDelayed}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Signing Up
      {:else if passwordFormSwitching}
        <Fingerprint size={19} class="mr-2" />
        Sign Up
      {:else}
        Sign Up
      {/if}
    </Form.Button>

    <div class="flex justify-center items-center pt-4">
      <Separator class="w-[43%] mr-4" orientation="horizontal" />
      <p class="text-xs text-muted-foreground">or</p>
      <Separator class="w-[43%] ml-4" orientation="horizontal" />
    </div>

    <Button class="w-full mt-4" variant="secondary" on:click={swapLoginType}>
      {#if passwordFormSwitching}
        Password Sign Up
      {:else}
        <Fingerprint size={19} class="mr-2" />
        Passkey Sign Up
      {/if}
    </Button>
  </form>
{:else if transitionComplete}
  <form class="flex flex-col" method="POST" use:passkeyEnhance action="?/signup-passkey">
    <Form.Field form={passkeyForm} name="username">
      <Form.Control let:attrs>
        <Form.Label>Username</Form.Label>
        <Input
          on:input={() => dispatch('interacted')}
          {...attrs}
          bind:value={$passkeyFormData.username}
        />
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field form={passkeyForm} name="email" class="mt-1">
      <Form.Control let:attrs>
        <Form.Label>Email</Form.Label>
        <Input
          on:input={() => dispatch('interacted')}
          {...attrs}
          bind:value={$passkeyFormData.email}
        />
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Button disabled={passkeyDelayed} class="w-full mt-4">
      {#if passkeyDelayed}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Signing Up
      {:else}
        <Fingerprint size={19} class="mr-2" />
        Sign Up
      {/if}
    </Form.Button>

    <div class="flex justify-center items-center pt-4">
      <Separator class="w-[43%] mr-4" orientation="horizontal" />
      <p class="text-xs text-muted-foreground">or</p>
      <Separator class="w-[43%] ml-4" orientation="horizontal" />
    </div>

    <Button class="w-full mt-4" variant="secondary" on:click={swapLoginType}>
      Password Sign Up
    </Button>
  </form>
{/if}
