import { PUBLIC_APP_DOMAIN, PUBLIC_APP_NAME } from '$env/static/public';
import { base32, base64 } from 'oslo/encoding';

export const initializePasskey = async ({ username, name }: { username: string; name: string }) => {
  const challengeResponse = await fetch('/auth/passkey', { method: 'put' });
  const challengeData = await challengeResponse.json();
  const challenge = base32.decode(challengeData.challenge.toUpperCase());

  const credential = await navigator.credentials.create({
    publicKey: {
      attestation: 'none',
      rp: {
        // application info
        id: PUBLIC_APP_DOMAIN,
        name: PUBLIC_APP_NAME
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: username,
        displayName: name
      },
      pubKeyCredParams: [
        // https://www.iana.org/assignments/cose/cose.xhtml
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      challenge: challenge,
      authenticatorSelection: {
        userVerification: 'required'
      }
    }
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('Failed to create credential');
  }

  const response = credential.response;
  if (!(response instanceof AuthenticatorAttestationResponse)) {
    throw new Error('Unexpacted');
  }

  const clientDataJSON: ArrayBuffer = response.clientDataJSON;
  const attestationObject: ArrayBuffer = response.attestationObject;
  return {
    clientDataJSON: base64.encode(new Uint8Array(clientDataJSON)),
    attestationObject: base64.encode(new Uint8Array(attestationObject))
  };
};
