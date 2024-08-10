<script lang="ts">
  import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
  import { type LoginFormSchema, type LoginPasskeySchema } from './schema';
  import { Input } from '$lib/components/ui/input';
  import * as Form from '$lib/components/ui/form';
  import { Label } from '$lib/components/ui/label';
  import { Fingerprint, LoaderCircle } from 'lucide-svelte';
  import { authenticatePasskey } from '$lib/auth/passkey';
  import { createEventDispatcher, tick } from 'svelte';
  import { Separator } from '$lib/components/ui/separator';
  import { Button } from '$lib/components/ui/button';
  import { slide } from 'svelte/transition';
  import { get } from 'svelte/store';

  export let data: {
    loginForm: SuperValidated<Infer<LoginFormSchema>>;
    passkeyForm: SuperValidated<Infer<LoginPasskeySchema>>;
  };
  let type: 'password' | 'passkey' = 'password';

  const loginForm = superForm(data.loginForm, {
    clearOnSubmit: 'none',
    multipleSubmits: 'prevent',
    dataType: 'json' // needed for union zod types
  });
  const passkeyForm = superForm(data.passkeyForm, {
    clearOnSubmit: 'none',
    multipleSubmits: 'prevent',
    dataType: 'json',
    onSubmit: async (form) => {
      const { challengeId, credentialId, signature, authenticatorData, clientDataJSON } =
        await authenticatePasskey();

      if (!challengeId || !credentialId || !signature || !authenticatorData || !clientDataJSON) {
        passkeyDelayed = false;
        form.cancel();
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

  const { form: loginFormData, enhance: loginEnhance, delayed: loginDelayed } = loginForm;
  const {
    form: passkeyFormData,
    enhance: passkeyEnhance,
    delayed: passkeyDelayedForm
  } = passkeyForm;

  $: passkeyDelayed = $passkeyDelayedForm;

  $: if (type === 'password') {
    $passkeyFormData.usernameOrEmail = $loginFormData.usernameOrEmail;
  } else {
    $loginFormData.usernameOrEmail = $passkeyFormData.usernameOrEmail;
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
  <form class="flex flex-col" method="POST" use:loginEnhance action="?/login">
    <Form.Field form={loginForm} name="usernameOrEmail">
      <Form.Control let:attrs>
        <Label>Email/Username</Label>
        <Input
          on:input={() => dispatch('interacted')}
          {...attrs}
          bind:value={$loginFormData.usernameOrEmail}
        />
      </Form.Control>
    </Form.Field>

    <div
      transition:slide|local={{ duration: 250 }}
      on:outroend={() => {
        transitionComplete = true;
        passwordFormSwitching = false;
      }}
      class="mt-5"
    >
      <Form.Field form={loginForm} name="password">
        <Form.Control let:attrs>
          <div class="flex items-center">
            <Label for="password">Password</Label>
            <a href="/auth/password-reset" class="ml-auto inline-block text-sm underline">
              Forgot your password?
            </a>
          </div>
          <Input
            on:input={() => dispatch('interacted')}
            {...attrs}
            bind:value={$loginFormData.password}
            autocomplete="on"
            type="password"
          />
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

    <div class="flex justify-center items-center pt-4">
      <Separator class="w-[43%] mr-4" orientation="horizontal" />
      <p class="text-xs text-muted-foreground">or</p>
      <Separator class="w-[43%] ml-4" orientation="horizontal" />
    </div>

    <Button class="w-full mt-4" variant="secondary" on:click={swapLoginType}>
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
      <Form.Control let:attrs>
        <Label>Email/Username</Label>
        <Input
          on:input={() => dispatch('interacted')}
          {...attrs}
          bind:value={$passkeyFormData.usernameOrEmail}
        />
      </Form.Control>
    </Form.Field>

    <Form.Button disabled={passkeyDelayed} class="w-full mt-6">
      {#if passkeyDelayed}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Logging In
      {:else}
        <Fingerprint size={19} class="mr-2" />
        Login
      {/if}
    </Form.Button>

    <div class="flex justify-center items-center pt-4">
      <Separator class="w-[43%] mr-4" orientation="horizontal" />
      <p class="text-xs text-muted-foreground">or</p>
      <Separator class="w-[43%] ml-4" orientation="horizontal" />
    </div>

    <Button class="w-full mt-4" variant="secondary" on:click={swapLoginType}>Password Login</Button>
  </form>
{/if}
