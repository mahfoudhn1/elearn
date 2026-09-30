// Ambient declarations for untyped third-party modules and browser globals.

declare module "react-ios-time-picker" {
  import type { ComponentType } from "react";

  interface TimePickerProps {
    value?: string;
    onChange?: (value: string) => void;
    [key: string]: unknown;
  }

  const TimePicker: ComponentType<TimePickerProps>;
  export default TimePicker;
  export { TimePicker };
}

declare function fbq(
  command: string,
  eventName: string,
  params?: Record<string, unknown>,
  options?: Record<string, unknown>,
): void;
