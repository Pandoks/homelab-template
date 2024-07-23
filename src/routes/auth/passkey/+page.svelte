<script lang="ts">
  import { initializePasskey } from '$lib/auth/passkey';
</script>

<button on:click={() => initializePasskey({ username: 'test', name: 'test' })}>test</button>
