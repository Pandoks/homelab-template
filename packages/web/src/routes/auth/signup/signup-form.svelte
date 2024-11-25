<script lang="ts">
  import { superForm, type Infer, type SuperForm, type SuperValidated } from 'sveltekit-superforms';
  import {
    signupPasskeySchema,
    signupSchema,
    type SignupPasskeySchema,
    type SignupSchema
  } from './schema';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { Input, PasswordInput } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { Label } from '$lib/components/ui/label';
  import { Fingerprint, LoaderCircle } from 'lucide-svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { slide } from 'svelte/transition';
  import { Button } from '$lib/components/ui/button';
  import { tick } from 'svelte';
  import { z } from 'zod';
  import { emailSchema, usernameSchema } from '../schema';
  import { registerPasskey } from '@startup-template/core/auth/passkey';
  import { PUBLIC_APP_NAME } from '$env/static/public';

  let {
    data,
    interacted
  }: {
    data: {
      signupForm: SuperValidated<Infer<SignupSchema>>;
      passkeyForm: SuperValidated<Infer<SignupPasskeySchema>>;
    };
    interacted?: () => void;
  } = $props();

  const signupForm = superForm(data.signupForm, {
    validators: zodClient(signupSchema),
    clearOnSubmit: 'message',
    multipleSubmits: 'prevent'
  });
  const {
    form: signupFormData,
    enhance: signupEnhance,
    delayed: signupDelayed,
    errors: signupErrors
  } = signupForm;

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
          name: username,
          appName: PUBLIC_APP_NAME
        });
        if (!challengeId || !clientDataJSON || !attestationObject) {
          form.cancel();
          return;
        }

        data.set('challengeId', challengeId);
        data.set('clientDataJSON', clientDataJSON);
        data.set('attestationObject', attestationObject);
      } catch (error) {
        console.error(error);
        // TODO: delete the passkey (wait for https://github.com/w3c/webauthn/pull/2093)
        form.cancel();
        return;
      }
    }
  });
  const {
    form: passkeyFormData,
    enhance: passkeyEnhance,
    delayed: passkeyDelayedForm,
    errors: passkeyErrors
  } = passkeyForm;

  /** Handle synchronizing form data */
  let type: 'password' | 'passkey' = $state('password');

  const synchronizeFormData = (formData: {
    username: string;
    email: string;
    usernameErrors?: string[];
    emailErrors?: string[];
  }) => {
    $signupFormData.username = $passkeyFormData.username = formData.username;
    $signupFormData.email = $passkeyFormData.email = formData.email;
    $signupErrors.username = formData.username ? formData.usernameErrors : undefined;
    $signupErrors.email = formData.email ? formData.emailErrors : undefined;
    $passkeyErrors.username = formData.username ? formData.usernameErrors : undefined;
    $passkeyErrors.email = formData.email ? formData.emailErrors : undefined;
  };

  const sharedFormData = $derived({
    username: type === 'password' ? $signupFormData.username : $passkeyFormData.username,
    email: type === 'password' ? $signupFormData.email : $passkeyFormData.email,
    usernameErrors: type === 'password' ? $signupErrors.username : $passkeyErrors.username,
    emailErrors: type === 'password' ? $signupErrors.email : $passkeyErrors.email
  });
  $effect(() => {
    console.log($signupErrors.username);
  });

  /** Handle animations */
  let transitionComplete = $state(false);
  let passwordFormSwitching = $state(false); // only used for password signup because of transition

  const swapLoginType = async () => {
    transitionComplete = false;
    passwordFormSwitching = true;

    // update the buttons first before transition starts
    await tick();

    type = type === 'password' ? 'passkey' : 'password';
    passwordFormSwitching = false;
  };
</script>

<!-- your lsp will hate this snippet but it works -->
{#snippet sharedFormField({
  label,
  form,
  $formData
}: {
  label: 'Username' | 'Email';
  form: SuperForm<any, any>;
  $formData: Record<string, unknown>;
})}
  <Form.Field {form} name={label.toLowerCase()}>
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>{label}</Form.Label>
        <Input
          oninput={(e) => {
            $formData[label.toLowerCase()] = e.target.value;
            interacted?.();
          }}
          value={sharedFormData[label.toLowerCase()]}
          {...props}
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>
{/snippet}

{#snippet divider()}
  <div class="flex justify-center items-center pt-4">
    <Separator class="w-[43%] mr-4" orientation="horizontal" />
    <p class="text-xs text-muted-foreground">or</p>
    <Separator class="w-[43%] ml-4" orientation="horizontal" />
  </div>
{/snippet}

{#if type === 'password'}
  <form class="flex flex-col" method="POST" use:signupEnhance action="?/signup">
    {@render sharedFormField({ label: 'Username', form: signupForm, $formData: $signupFormData })}
    {@render sharedFormField({ label: 'Email', form: signupForm, $formData: $signupFormData })}

    <div
      transition:slide|local={{ duration: 250 }}
      onoutroend={() => {
        transitionComplete = true;
        passwordFormSwitching = false;
      }}
      class="mt-2"
    >
      <Form.Field form={signupForm} name="password">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center">
              <Form.Label for="password">Password</Form.Label>
            </div>
            <PasswordInput
              oninput={() => interacted?.()}
              bind:value={$signupFormData.password}
              autocomplete="on"
              type="password"
              {...props}
            />
          {/snippet}
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

    {@render divider()}

    <Button
      class="w-full mt-4"
      variant="secondary"
      onclick={async () => {
        synchronizeFormData(sharedFormData);
        await swapLoginType();
      }}
    >
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
    {@render sharedFormField({ label: 'Username', form: passkeyForm, $formData: $passkeyFormData })}
    {@render sharedFormField({ label: 'Email', form: passkeyForm, $formData: $passkeyFormData })}

    <Form.Button disabled={$passkeyDelayedForm} class="w-full mt-4">
      {#if $passkeyDelayedForm}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Signing Up
      {:else}
        <Fingerprint size={19} class="mr-2" />
        Sign Up
      {/if}
    </Form.Button>

    {@render divider()}

    <Button
      class="w-full mt-4"
      variant="secondary"
      onclick={async () => {
        synchronizeFormData(sharedFormData);
        await swapLoginType();
      }}
    >
      Password Sign Up
    </Button>
  </form>
{/if}
