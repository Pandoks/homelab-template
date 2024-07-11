<script lang="ts">
  import qrCode from 'qrcode';
  import type { PageData } from './$types';

  export let data: PageData;

  const twoFactorQrCodePromise = qrCode.toDataURL(data.qrCodeLink);
</script>

{#await twoFactorQrCodePromise then twoFactorQrCode}
  <img class="qrcode" src={twoFactorQrCode} alt="2 factor authentication qr code" />
{/await}
