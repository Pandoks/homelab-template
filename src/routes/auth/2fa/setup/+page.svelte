<script>
  import { QRCode } from '$lib/components/ui/qr';
  let url = 'https://example.com';
</script>

<QRCode value={url} class="w-[1000px]" />
<input bind:value={url} />
