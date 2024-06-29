<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<form method="post" action="/logout" use:enhance>
	<button>Sign out</button>
</form>
