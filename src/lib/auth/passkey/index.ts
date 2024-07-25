import { PUBLIC_APP_DOMAIN, PUBLIC_APP_NAME } from '$env/static/public';
import { coseAlgorithmES256, coseAlgorithmRS256 } from '@oslojs/webauthn';
import { base64 } from 'oslo/encoding';

export const registerPasskey = async ({ username, name }: { username: string; name: string }) => {
  try {
    const challengeResponse = await fetch('/auth/passkey', {
      method: 'put',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    });
    const challengeData = await challengeResponse.json();
    const challenge = base64.decode(challengeData.challenge);

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
          { type: 'public-key', alg: coseAlgorithmES256 }, // ES256
          { type: 'public-key', alg: coseAlgorithmRS256 } // RS256
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
      throw new Error('Unexpected error');
    }

    const clientDataJSON: ArrayBuffer = response.clientDataJSON;
    const attestationObject: ArrayBuffer = response.attestationObject;
    return {
      clientDataJSON: base64.encode(new Uint8Array(clientDataJSON)),
      attestationObject: base64.encode(new Uint8Array(attestationObject))
    };
  } catch (err) {
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
          // User cancelled the operation or it timed out
          return {
            clientDataJSON: null,
            attestationObject: null
          };
        case 'SecurityError':
          // The operation failed for security reasons
          return {
            clientDataJSON: null,
            attestationObject: null
          };
        case 'AbortError':
          // The operation was aborted
          return {
            clientDataJSON: null,
            attestationObject: null
          };
        case 'InvalidStateError':
          // The operation is not allowed in the current state
          return {
            clientDataJSON: null,
            attestationObject: null
          };
        case 'NotSupportedError':
          // The requested authentication method is not supported
          return {
            clientDataJSON: null,
            attestationObject: null
          };
        default:
          throw new Error('An error occurred during passkey creation');
      }
    } else {
      throw err;
    }
  }
};

export const authenticatePasskey = async ({ username }: { username: string }) => {
  try {
    const challengeResponse = await fetch('/auth/passkey', {
      method: 'put',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    });
    const challengeData = await challengeResponse.json();
    const challenge = base64.decode(challengeData.challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        userVerification: 'required'
      }
    });

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error('Failed to create credential');
    }

    const response = credential.response;
    if (!(response instanceof AuthenticatorAssertionResponse)) {
      throw new Error('Unexpected error');
    }

    const credentialId: ArrayBuffer = credential.rawId;
    const signature: ArrayBuffer = response.signature;
    const authenticatorData: ArrayBuffer = response.authenticatorData;
    const clientDataJSON: ArrayBuffer = response.clientDataJSON;
    return {
      credentialId: base64.encode(new Uint8Array(credentialId)),
      signature: base64.encode(new Uint8Array(signature)),
      authenticatorData: base64.encode(new Uint8Array(authenticatorData)),
      clientDataJSON: base64.encode(new Uint8Array(clientDataJSON))
    };
  } catch (err) {
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
          // User cancelled the operation or it timed out
          return {
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null
          };
        case 'SecurityError':
          // The operation failed for security reasons
          return {
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null
          };
        case 'AbortError':
          // The operation was aborted
          return {
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null
          };
        case 'InvalidStateError':
          // The operation is not allowed in the current state
          return {
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null
          };
        case 'NotSupportedError':
          // The requested authentication method is not supported
          return {
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null
          };
        default:
          throw new Error('An error occurred during authentication');
      }
    } else {
      throw err;
    }
  }
};
