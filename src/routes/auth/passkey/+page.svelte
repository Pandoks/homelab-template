<script lang="ts">
  import { initializePasskey } from '$lib/auth/passkey';

  let clientDataJSON: any = null;
  let attestationObject: any = null;

  const setup = async () => {
    const response = await initializePasskey({ username: 'test', name: 'test' });
    clientDataJSON = response.clientDataJSON;
    attestationObject = response.attestationObject;
  };

  const send = async () => {
    const response = await fetch('/auth/passkey', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientDataJSON: clientDataJSON, attestationObject: attestationObject })
    });
    const data = await response.json();
    console.log(data);
  };
</script>

<button on:click={setup}>test</button>
<button on:click={send}>send</button>
