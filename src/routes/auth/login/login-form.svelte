<script lang="ts">
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { loginSchema, type LoginFormSchema } from './schema';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Input } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import { Label } from '$lib/components/ui/label';

	export let data: SuperValidated<Infer<LoginFormSchema>>;

	const form = superForm(data, {
		validators: zodClient(loginSchema)
	});

	const { form: formData, enhance } = form;
</script>

<form class="grid gap-4" method="post" use:enhance action="?/login">
	<Form.Field {form} name="usernameOrEmail" class="grid gap-2">
		<Form.Control let:attrs>
			<Label>Email/Username</Label>
			<Input {...attrs} bind:value={$formData.usernameOrEmail} placeholder="m@example.com" />
		</Form.Control>
	</Form.Field>
	<Form.Field {form} name="password" class="grid gap-2">
		<Form.Control let:attrs>
			<div class="flex items-center">
				<Label for="password">Password</Label>
				<a href="##" class="ml-auto inline-block text-sm underline"> Forgot your password? </a>
			</div>
			<Input {...attrs} bind:value={$formData.password} type="password" />
		</Form.Control>
	</Form.Field>
	<Form.Button>Login</Form.Button>
</form>
