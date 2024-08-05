import { coseAlgorithmES256 } from '@oslojs/webauthn';
import { base64url } from 'oslo/encoding';

export const registerPasskey = async ({ username, name }: { username: string; name: string }) => {
  try {
    const challengeResponse = await fetch('/auth/passkey/challenge', { method: 'POST' });
    const challengeData = await challengeResponse.json();
    const challenge = base64url.decode(challengeData.challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        attestation: 'none',
        rp: {
          // application info
          id: 'localhost',
          name: 'Test APP'
        },
        user: {
          id: base64url.decode(challengeData.userId as string),
          name: username,
          displayName: name
        },
        pubKeyCredParams: [
          // https://www.iana.org/assignments/cose/cose.xhtml
          { type: 'public-key', alg: coseAlgorithmES256 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        challenge: challenge,
        authenticatorSelection: {
          userVerification: 'required',
          residentKey: 'required',
          requireResidentKey: true
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

    return {
      challengeId: challengeData.id as string,
      clientDataJSON: base64url.encode(new Uint8Array(response.clientDataJSON)),
      attestationObject: base64url.encode(new Uint8Array(response.attestationObject))
    };
  } catch (err) {
    if (err instanceof DOMException) {
      // They're all returning the same thing but this is templated so you can change behavior
      // depending on what you want
      switch (err.name) {
        case 'NotAllowedError':
          // User cancelled the operation or it timed out
          return {
            id: null,
            clientDataJSON: null,
            attestationObject: null
          };
        case 'SecurityError':
          // The operation failed for security reasons
          return {
            id: null,
            clientDataJSON: null,
            attestationObject: null
          };
        case 'AbortError':
          // The operation was aborted
          return {
            id: null,
            clientDataJSON: null,
            attestationObject: null
          };
        case 'InvalidStateError':
          // The operation is not allowed in the current state
          return {
            id: null,
            clientDataJSON: null,
            attestationObject: null
          };
        case 'NotSupportedError':
          // The requested authentication method is not supported
          return {
            id: null,
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

export const authenticatePasskey = async () => {
  try {
    const challengeResponse = await fetch('/auth/passkey/challenge', { method: 'POST' });
    const challengeData = await challengeResponse.json();
    const challenge = base64url.decode(challengeData.challenge);

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

    return {
      id: challengeData.id as string,
      credentialId: base64url.encode(new Uint8Array(credential.rawId)),
      signature: base64url.encode(new Uint8Array(response.signature)),
      authenticatorData: base64url.encode(new Uint8Array(response.authenticatorData)),
      clientDataJSON: base64url.encode(new Uint8Array(response.clientDataJSON))
    };
  } catch (err) {
    if (err instanceof DOMException) {
      // They're all returning the same thing but this is templated so you can change behavior
      // depending on what you want
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
