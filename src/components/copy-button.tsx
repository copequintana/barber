"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copiar enlace",
  copiedMessage = "Enlace copiado",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "value" | "onClick"> & {
  value: string;
  label?: string;
  copiedMessage?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success(copiedMessage);
        } catch {
          toast.error("No se pudo copiar; selecciónalo y cópialo a mano");
        }
      }}
    >
      <Copy /> {label}
    </Button>
  );
}
