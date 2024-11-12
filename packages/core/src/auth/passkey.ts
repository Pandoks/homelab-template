import { coseAlgorithmES256 } from "@oslojs/webauthn";

/**
 * Start passkey registration in the browser
 *
 * @param username username of user
 * @param name     name of user
 * @param domain   domain of the website
 * @param appName  name of the app
 */
export const registerPasskey = async ({
  username,
  name,
  domain,
  appName,
}: {
  username: string;
  name: string;
  domain: string;
  appName: string;
}) => {
  const challengeResponse = await fetch("/auth/passkey/challenge", {
    method: "POST",
  });
  const challengeData = await challengeResponse.json();
  const challenge = base64url.decode(challengeData.challenge);

  const credential = await navigator.credentials.create({
    publicKey: {
      attestation: "none",
      rp: {
        // application info
        id: domain,
        name: appName,
      },
      user: {
        id: base64url.decode(challengeData.userId as string),
        name: username,
        displayName: name,
      },
      pubKeyCredParams: [
        // https://www.iana.org/assignments/cose/cose.xhtml
        { type: "public-key", alg: coseAlgorithmES256 }, // ES256
      ],
      challenge: challenge,
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "required",
        requireResidentKey: true,
      },
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Failed to create credential");
  }

  const response = credential.response;
  if (!(response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("Unexpected error");
  }

  return {
    challengeId: challengeData.id as string,
    clientDataJSON: base64url.encode(new Uint8Array(response.clientDataJSON)),
    attestationObject: base64url.encode(
      new Uint8Array(response.attestationObject),
    ),
  };
};

export const authenticatePasskey = async () => {
  try {
    const challengeResponse = await fetch("/auth/passkey/challenge", {
      method: "POST",
    });
    const challengeData = await challengeResponse.json();
    const challenge = base64url.decode(challengeData.challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        userVerification: "required",
      },
    });

    if (!(credential instanceof PublicKeyCredential)) {
      throw new Error("Failed to create credential");
    }

    const response = credential.response;
    if (!(response instanceof AuthenticatorAssertionResponse)) {
      throw new Error("Unexpected error");
    }

    return {
      challengeId: challengeData.id as string,
      credentialId: base64url.encode(new Uint8Array(credential.rawId)),
      signature: base64url.encode(new Uint8Array(response.signature)),
      authenticatorData: base64url.encode(
        new Uint8Array(response.authenticatorData),
      ),
      clientDataJSON: base64url.encode(new Uint8Array(response.clientDataJSON)),
    };
  } catch (err) {
    if (err instanceof DOMException) {
      // They're all returning the same thing but this is templated so you can change behavior
      // depending on what you want
      switch (err.name) {
        case "NotAllowedError":
          // User cancelled the operation or it timed out
          return {
            challengeId: null,
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null,
          };
        case "SecurityError":
          // The operation failed for security reasons
          return {
            challengeId: null,
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null,
          };
        case "AbortError":
          // The operation was aborted
          return {
            challengeId: null,
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null,
          };
        case "InvalidStateError":
          // The operation is not allowed in the current state
          return {
            challengeId: null,
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null,
          };
        case "NotSupportedError":
          // The requested authentication method is not supported
          return {
            challengeId: null,
            credentialId: null,
            signature: null,
            authenticatorData: null,
            clientDataJSON: null,
          };
        default:
          throw new Error("An error occurred during authentication");
      }
    } else {
      throw err;
    }
  }
};
