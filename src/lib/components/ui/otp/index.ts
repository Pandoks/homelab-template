import Field from './input-otp-field.svelte';
import Root from './input-otp-root.svelte';

type Props = {
  /**
   * The input otp value from the hidden input
   */
  value?: string;

  /**
   * The input name value. If the OTP component is placed inside a form element. The value can be retrieved using this name
   *
   * @default otp
   */
  inputName?: string;

  /**
   * The max lenght which is set to the hidden input. Make sure this is the same as the number of input slots.
   */
  maxLength?: number;

  /**
   * Set if the entire input otp component needs to be disabled
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether you want to focus the input on mount
   *
   * @default false
   */
  autoFocus?: boolean;

  /**
   * Virtual keyboard appearance on mobile
   *
   * @default numeric
   */
  inputType?: 'numeric' | 'text' | 'decimal' | 'tel' | 'search' | 'email' | 'url';

  /**
   *  Where is the text located within the input
   *  Affects click-holding or long-press behavior
   *
   * @default left
   */
  textAlign?: 'left' | 'center' | 'right';

  /**
   *  Set the regexpattern for allowing only digits, only chars, or both
   *
   * @default digits
   */
  pattern?: 'digits' | 'chars' | 'digitsAndChars';

  /**
   * The function that is called when the input otp is correctly filled in.
   * @param args
   * @returns
   */
  onComplete?: (...args: any[]) => unknown;

  /**
   * @todo Add this functionality
   */
  // pushPasswordManagerStrategy?: "increase-width" | "none";

  /**
   * Insert your classes for the component here.
   */
  className?: string;
};

type Input = {
  /**
   * Indicates the index of the input slot
   */
  index: number;

  /**
   * Insert your classes for the component here.
   */
  className?: string;

  /**
   * Insert your classes for the component here when the component is focussed.
   */
  focusClassName?: string;
};

export {
  Root,
  Field,
  type Props,
  type Input,
  //
  Root as OTP,
  Field as OTPField,
  type Props as OTPProps,
  type Input as OTPInput
};
