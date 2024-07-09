<script lang="ts">
  import { OTP, OTPField } from '$lib/components/ui/otp';

  let otpref: any;

  // Set start value
  let value = '';

  function handleOtpComplete(otp: string) {
    console.log('OTP Complete:', otp);
  }

  function handleOtpChange(event: { detail: string }) {
    console.log('OTP changed:', value);
  }
</script>

<OTP
  pattern="digitsAndChars"
  bind:this={otpref}
  maxLength={6}
  on:change={handleOtpChange}
  bind:value
  autoFocus={true}
  onComplete={handleOtpComplete}
  className="flex items-center gap-2"
>
  <div class="flex items-center">
    <OTPField
      index={0}
      className="relative flex h-20 w-16 items-center justify-center border-y border-r border-input text-3xl transition-all first:rounded-l-md first:border-l last:rounded-r-md"
      focusClassName="z-10 ring-2 ring-ring ring-offset-background"
    />
    <OTPField
      index={1}
      className="relative flex h-20 w-16 items-center justify-center border-y border-r border-input text-3xl transition-all first:rounded-l-md first:border-l last:rounded-r-md"
      focusClassName="z-10 ring-2 ring-ring ring-offset-background"
    />
    <OTPField
      index={2}
      className="relative flex h-20 w-16 items-center justify-center border-y border-r border-input text-3xl transition-all first:rounded-l-md first:border-l last:rounded-r-md"
      focusClassName="z-10 ring-2 ring-ring ring-offset-background"
    />
    <OTPField
      index={3}
      className="relative flex h-20 w-16 items-center justify-center border-y border-r border-input text-3xl transition-all first:rounded-l-md first:border-l last:rounded-r-md"
      focusClassName="z-10 ring-2 ring-ring ring-offset-background"
    />
    <OTPField
      index={4}
      className="relative flex h-20 w-16 items-center justify-center border-y border-r border-input text-3xl transition-all first:rounded-l-md first:border-l last:rounded-r-md"
      focusClassName="z-10 ring-2 ring-ring ring-offset-background"
    />
    <OTPField
      index={5}
      className="relative flex h-20 w-16 items-center justify-center border-y border-r border-input text-3xl transition-all first:rounded-l-md first:border-l last:rounded-r-md"
      focusClassName="z-10 ring-2 ring-ring ring-offset-background"
    />
  </div>
</OTP>
