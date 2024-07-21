import { PUBLIC_APP_HOST, PUBLIC_APP_NAME } from '$env/static/public';

export const initializePasskey = async ({ username, name }: { username: string; name: string }) => {
  const credential = await navigator.credentials.create({
    publicKey: {
      attestation: 'none',
      rp: {
        // application info
        id: PUBLIC_APP_HOST,
        name: PUBLIC_APP_NAME
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: username,
        displayName: name
      },
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7 // ECDSA with SHA-256
        }
      ],
      challenge
    }
  });
};
