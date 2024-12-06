<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type LoginFormSchema, type LoginPasskeySchema } from './schema';
  import { Input, PasswordInput } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { Label } from '$lib/components/ui/label';
  import { Fingerprint, LoaderCircle } from 'lucide-svelte';
  import { tick } from 'svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { Button } from '$lib/components/ui/button';
  import { slide } from 'svelte/transition';
  import { get } from 'svelte/store';
  import { authenticatePasskey } from '@startup-template/core/auth/passkey';

  let {
    data,
    interacted
  }: {
    data: {
      loginForm: SuperValidated<Infer<LoginFormSchema>>;
      passkeyForm: SuperValidated<Infer<LoginPasskeySchema>>;
    };
    interacted?: () => void;
  } = $props();

  const loginForm = superForm(data.loginForm, {
    clearOnSubmit: 'none',
    multipleSubmits: 'prevent',
    dataType: 'json' // needed for union zod types
  });
  const { form: loginFormData, enhance: loginEnhance, delayed: loginDelayed } = loginForm;

  const passkeyForm = superForm(data.passkeyForm, {
    clearOnSubmit: 'none',
    multipleSubmits: 'prevent',
    dataType: 'json',
    onSubmit: async (form) => {
      const { challengeId, credentialId, signature, authenticatorData, clientDataJSON } =
        await authenticatePasskey();

      if (!challengeId || !credentialId || !signature || !authenticatorData || !clientDataJSON) {
        form.cancel();
        return;
      }

      passkeyForm.form.set({
        usernameOrEmail: get(passkeyForm.form).usernameOrEmail,
        credentialId: credentialId || '',
        challengeId: challengeId || '',
        signature: signature || '',
        encodedAuthenticatorData: authenticatorData || '',
        clientDataJSON: clientDataJSON || ''
      });
    }
  });
  const {
    form: passkeyFormData,
    enhance: passkeyEnhance,
    delayed: passkeyDelayedForm
  } = passkeyForm;

  /** Handle synchronizing form data */
  let type: 'password' | 'passkey' = $state('password');
  const sharedFormData = $derived({
    usernameOrEmail:
      type === 'password' ? $loginFormData.usernameOrEmail : $passkeyFormData.usernameOrEmail
  });

  const synchronizeFormData = (formData: { usernameOrEmail: string }) => {
    $passkeyFormData.usernameOrEmail = $loginFormData.usernameOrEmail = formData.usernameOrEmail;
  };

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

{#snippet divider()}
  <div class="flex justify-center items-center pt-4">
    <Separator class="w-[43%] mr-4" orientation="horizontal" />
    <p class="text-xs text-muted-foreground">or</p>
    <Separator class="w-[43%] ml-4" orientation="horizontal" />
  </div>
{/snippet}

{#if type === 'password'}
  <form class="flex flex-col" method="POST" use:loginEnhance action="?/login">
    <Form.Field form={loginForm} name="usernameOrEmail">
      <Form.Control>
        {#snippet children({ props })}
          <Label>Email/Username</Label>
          <Input
            oninput={() => interacted?.()}
            {...props}
            bind:value={$loginFormData.usernameOrEmail}
          />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <div
      transition:slide|local={{ duration: 250 }}
      onoutroend={() => {
        transitionComplete = true;
        passwordFormSwitching = false;
      }}
      class="mt-5"
    >
      <Form.Field form={loginForm} name="password">
        <Form.Control>
          {#snippet children({ props })}
            <div class="flex items-center">
              <Label for="password">Password</Label>
              <a href="/auth/password-reset" class="ml-auto inline-block text-sm underline">
                Forgot your password?
              </a>
            </div>
            <PasswordInput
              oninput={() => interacted?.()}
              {...props}
              bind:value={$loginFormData.password}
              autocomplete="on"
              type="password"
            />
          {/snippet}
        </Form.Control>
      </Form.Field>
    </div>

    <Form.Button disabled={$loginDelayed} class="w-full mt-6">
      {#if $loginDelayed}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Logging In
      {:else if passwordFormSwitching}
        <Fingerprint size={19} class="mr-2" />
        Login
      {:else}
        Login
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
        Password Login
      {:else}
        <Fingerprint size={19} class="mr-2" />
        Passkey Login
      {/if}
    </Button>
  </form>
{:else if transitionComplete}
  <form class="flex flex-col" method="POST" use:passkeyEnhance action="?/login-passkey">
    <Form.Field form={passkeyForm} name="usernameOrEmail">
      <Form.Control>
        {#snippet children({ props })}
          <Label>Email/Username</Label>
          <Input
            oninput={() => interacted?.()}
            {...props}
            bind:value={$passkeyFormData.usernameOrEmail}
          />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Button disabled={$passkeyDelayedForm} class="w-full mt-6">
      {#if $passkeyDelayedForm}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Logging In
      {:else}
        <Fingerprint size={19} class="mr-2" />
        Login
      {/if}
    </Form.Button>

    {@render divider()}

    <Button
      class="w-full mt-4"
      variant="secondary"
      onclick={async () => {
        synchronizeFormData(sharedFormData);
        swapLoginType();
      }}
    >
      Password Login
    </Button>
  </form>
{/if}
