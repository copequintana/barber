"use client";

import { Tabs } from "@/components/ui/tabs";

export function SettingsTabs({
  defaultTab,
  children,
}: {
  defaultTab: string;
  children: React.ReactNode;
}) {
  return (
    <Tabs
      defaultValue={defaultTab}
      className="gap-5"
      onValueChange={(value) => {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", value);
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      }}
    >
      {children}
    </Tabs>
  );
}
