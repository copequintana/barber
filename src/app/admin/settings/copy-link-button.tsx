"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url }: { url: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Enlace copiado");
        } catch {
          toast.error("No se pudo copiar; selecciona el enlace y cópialo a mano");
        }
      }}
    >
      <Copy /> Copiar enlace
    </Button>
  );
}
