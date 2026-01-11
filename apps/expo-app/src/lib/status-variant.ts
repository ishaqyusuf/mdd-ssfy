import { StatusVariantProps } from "@/components/status";

const status: { [id in NonNullable<StatusVariantProps>]: string[] } = {
  accent: [],
  destructive: [],
  primary: [],
  secondary: [],
  muted: [],
  success: [],
  warn: ["submitted"],
};
export function getStatusVariant(value: string): StatusVariantProps {
  const normalized = value.toLowerCase();

  for (const [variant, values] of Object.entries(status)) {
    if (values.some((v) => v.toLowerCase() === normalized)) {
      return variant as StatusVariantProps;
    }
  }
  return "primary";
}
