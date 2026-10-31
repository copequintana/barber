"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const OK_MESSAGES: Record<string, string> = {
  "1": "Cambios guardados",
  invite: "Invitación reenviada",
};

export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ok = params.get("ok");
  const error = params.get("error");

  useEffect(() => {
    if (!ok && !error) return;
    if (error) toast.error(error, { id: "flash" });
    else if (ok) toast.success(OK_MESSAGES[ok] ?? "Listo", { id: "flash" });
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [ok, error, params, pathname, router]);

  return null;
}
