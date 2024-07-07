<script lang="ts">
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { signupSchema, type SignupSchema } from './schema';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Input } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import { Label } from '$lib/components/ui/label';
	import { LoaderCircle } from 'lucide-svelte';

	export let data: SuperValidated<Infer<SignupSchema>>;

	const form = superForm(data, {
		validators: zodClient(signupSchema),
		clearOnSubmit: 'message',
		multipleSubmits: 'prevent',
		dataType: 'json'
	});

	const { form: formData, enhance, delayed } = form;
</script>

<form class="grid gap-4" method="post" use:enhance action="?/login">
	<Form.Field {form} name="username" class="grid gap-2">
		<Form.Control let:attrs>
			<Label>Username</Label>
			<Input {...attrs} bind:value={$formData.username} />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="email" class="grid gap-2">
		<Form.Control let:attrs>
			<Label>Email</Label>
			<Input {...attrs} bind:value={$formData.email} />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="password" class="grid gap-2">
		<Form.Control let:attrs>
			<div class="flex items-center">
				<Label for="password">Password</Label>
			</div>
			<Input {...attrs} bind:value={$formData.password} type="password" />
		</Form.Control>
	</Form.Field>

	{#if $delayed}
		<Form.Button disabled class="w-full">
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Signing Up
		</Form.Button>
	{:else}
		<Form.Button>Signup</Form.Button>
	{/if}

	<fieldset>
		<Form.Field
			{form}
			name="twoFactor"
			class="flex flex-row items-center justify-between rounded-lg border p-4"
		></Form.Field>
	</fieldset>
</form>
