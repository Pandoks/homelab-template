<script lang="ts">
  import { registerPasskey, authenticatePasskey } from '$lib/auth/passkey';
  import { base64url } from 'oslo/encoding';

  let clientDataJSON: any = null;
  let attestationObject: any = null;

  let credentialId: any = null;
  let signature: any = null;
  let authenticatorData: any = null;

  let id: any = null;

  $: {
    console.log('clientDataJSON: ', clientDataJSON);
    console.log('attestationObject: ', attestationObject);
    console.log('credentialId: ', credentialId);
    console.log('signature: ', signature);
    console.log('authenticatorData: ', authenticatorData);
    console.log('id: ', id);
  }

  const setup = async () => {
    const response = await registerPasskey({ username: 'asdfasdfasdf', name: 'asdfasf' });
    clientDataJSON = response.clientDataJSON;
    attestationObject = response.attestationObject;
    id = response.id;
  };

  const register = async () => {
    console.log(
      base64url.encode(
        base64url.decode(
          'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVkBZ6LvhUwoa0ewDvgtCl7bGsTdUCF-Azqv2gpmHinlF55WRQAAAAF2aXJ0dWFsLWF1dGhuLXYxACDs_GPW3hRfRVxK-GPgeEFF05vi_Ljx-febAkTFY7B_fKQBAwM5AQAgWQEAvnizbuF8Rcu0Nf31R77vmxDRTKNP3lJYDOTD2p-gh0qgqi_AG77LlDxIOyWTP-gpAcFW6AaTHSPuGmBgZiFQQHlbWnvQX3L7tWxYkIKHit7yxMuCtWJn33BZj51z-8BjFk5V5yZ0eUDlYFPMjsTPoG1nkByoj-NZgQ7R5PJkYRmHP05zSoPLidZSwhhseCSUyrPSHUe1L43uhNREDqJmiCr6hbuHageItAi6WlVgEz2fH4FruEue9NrbU4YGv0gXAKuW2fqsh-aFPhjqOuulNaC2qQ1kt5M9sc2m34s5GROAAPJkbuft8toQdrWXlr8St91wpudkXdI9exR3pwuFjSFDAQAB'
        )
      ) ===
        'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVkBZ6LvhUwoa0ewDvgtCl7bGsTdUCF-Azqv2gpmHinlF55WRQAAAAF2aXJ0dWFsLWF1dGhuLXYxACDs_GPW3hRfRVxK-GPgeEFF05vi_Ljx-febAkTFY7B_fKQBAwM5AQAgWQEAvnizbuF8Rcu0Nf31R77vmxDRTKNP3lJYDOTD2p-gh0qgqi_AG77LlDxIOyWTP-gpAcFW6AaTHSPuGmBgZiFQQHlbWnvQX3L7tWxYkIKHit7yxMuCtWJn33BZj51z-8BjFk5V5yZ0eUDlYFPMjsTPoG1nkByoj-NZgQ7R5PJkYRmHP05zSoPLidZSwhhseCSUyrPSHUe1L43uhNREDqJmiCr6hbuHageItAi6WlVgEz2fH4FruEue9NrbU4YGv0gXAKuW2fqsh-aFPhjqOuulNaC2qQ1kt5M9sc2m34s5GROAAPJkbuft8toQdrWXlr8St91wpudkXdI9exR3pwuFjSFDAQAB'
    );
    const reverse = (base64JSONString: string) => {
      const jsonString = atob(base64JSONString);
      const dataObject = JSON.parse(jsonString);
      const utf8Encoder = new TextEncoder();
      const encodedClientData = utf8Encoder.encode(jsonString);
      return base64url.encode(encodedClientData);
    };
    const response = await fetch('/auth/passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '7Pxj1t4UX0VcSvhj4HhBRdOb4vy48fn3mwJExWOwf3w',
        username: 'testasdlfsdfjkkjkasdfjkjkjkj',
        email: 'asdfasdfasdf@asdfcasdfasd.com',
        clientDataJSON: reverse(
          'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiRHc0TkRBc0tDUWdIQmdVRUF3SUJBQSIsIm9yaWdpbiI6Imh0dHBzOi8vZ3JhbXRoYW5vcy5naXRodWIuaW8iLCJjcm9zc09yaWdpbiI6ZmFsc2UsInZpcnR1YWxfYXV0aGVudGljYXRvciI6IkdyYW1UaGFub3MgJiBVbml2ZXJzaXR5IG9mIFBpcmFldXMifQ'
        ),
        attestationObject:
          'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVkBZ6LvhUwoa0ewDvgtCl7bGsTdUCF-Azqv2gpmHinlF55WRQAAAAF2aXJ0dWFsLWF1dGhuLXYxACCiwuR3oDOvVJdD85NIGKiEMzoSeSCl1HS7YG3bkxuu-aQBAwM5AQAgWQEA3d6ewSqNxCVG-UyLzhry-0K-5M8rWAfM_wqV_lvcfvI1KDNDdyu6134vm_5PaUmDuLPKJTzWqaxRd5lYVJK0DcHKYXZq8ncvdZrcWSFSt8RxWzaWJfJ9om20d4RrAQqI8rNfV111DpS9rVxTpui9IEdmhov5IUyXBeQnnQ0_Clr19YxkmsUuQMQli9qPT6-bINYRPU9LtgAGByoODfpTaiBElfVj8wGtnB4c3W2E1Xe8AHpxDKAtBv6u7g71rXBsxMSNN1a6qqhT1G5ZPfqtv-xujEmH__ZTPeD4cDfk5fjcMbp1vo_RH86Oz7T8e_KlRxG7rkYnYAz29lga4Yd1WyFDAQAB'
      })
    });
    const data = await response.json();
    console.log('register data: ', data);
  };

  const authenticate = async () => {
    const response = await authenticatePasskey();
    console.log(response.authenticatorData);
    credentialId = response.credentialId;
    signature = response.signature;
    authenticatorData = response.authenticatorData;
    clientDataJSON = response.clientDataJSON;
    id = response.id;
  };

  const verify = async () => {
    console.log('Verify function called');
    console.log('Sending data:', {
      id,
      credentialId,
      signature,
      encodedAuthenticatorData: authenticatorData,
      clientDataJSON
    });
    const reverse = (base64JSONString: string) => {
      const jsonString = atob(base64JSONString);
      const dataObject = JSON.parse(jsonString);
      const utf8Encoder = new TextEncoder();
      const encodedClientData = utf8Encoder.encode(jsonString);
      return base64url.encode(encodedClientData);
    };
    try {
      const response = await fetch('/auth/passkey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '7Pxj1t4UX0VcSvhj4HhBRdOb4vy48fn3mwJExWOwf3w',
          credentialId: 'dGVzdHVzZXI',
          signature: 'U2lnbmF0dXJlRXhhbXBsZQ',
          encodedAuthenticatorData: 'eWFob28KQEJCQkJDQg_QUJDQkNC',
          clientDataJSON:
            'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiZXhhbXBsZUNoYWxsZW5nZSIsIm9yaWdpbiI6Imh0dHBzOi8vZXhhbXBsZS5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2V9'
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Verify data:', data);
    } catch (error) {
      console.error('Error in verify function:', error);
    }
  };
</script>

<button on:click={setup}>initializeRegister</button>
<button on:click={register}>register</button>
<button on:click={authenticate}>initializeAuthentication</button>
<button on:click={verify}>verify</button>
