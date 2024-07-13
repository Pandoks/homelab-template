<script lang="ts">
  import { QRCode } from '$lib/components/ui/qr';
  import { CircleCheck } from '$lib/components/animation/circle-check';
  import type { ActionData, PageData } from './$types';
  import { fade } from 'svelte/transition';
  import OtpForm from './otp-form.svelte';
  import { Button } from '$lib/components/ui/button';

  export let data: PageData;
  export let form: ActionData;

  let animate = false;
</script>

<div class="w-full h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-3">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">2 Factor Authentication</h1>
        <p class="text-muted-foreground">Scan the QR code with your authenticator app</p>
      </div>

      <div class="flex gap-4">
        <QRCode class="w-[100px]" value={data.qrCodeLink} />

        {#if animate}
          <div transition:fade>
            <p class=" text-muted-foreground text-xs">
              If you are unable to scan, enter this secret code instead
            </p>
            <CircleCheck />
            <Button><CircleCheck /></Button>
          </div>
        {/if}
        <label>
          <input type="checkbox" bind:checked={animate} />
        </label>
      </div>
      <OtpForm data={data.otpForm} success={form ? form.success : false} />
      {#if form && form.success}
        <CircleCheck />
      {/if}
    </div>
  </div>
</div>
