import { readableTextOn } from "@/lib/color";
import { getTenantBySlug } from "@/lib/tenancy";
import { getTheme } from "@/lib/themes";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Expone `--brand` (color de marca del tenant) como variable CSS a toda la
 * sección pública, para que los CTA/chips se vean consistentes con los
 * emails que recibe el cliente. Si el slug no existe, no hace nada: cada
 * page ya resuelve su propio notFound().
 */
export default async function TenantPublicLayout({ children, params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return children;

  const brand = tenant.brandColor
    ? ({
        "--brand": tenant.brandColor,
        "--brand-foreground": readableTextOn(tenant.brandColor),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      data-tenant-theme={getTheme(tenant.theme).id}
      className="flex flex-1 flex-col bg-background font-sans text-foreground"
      style={brand}
    >
      {children}
    </div>
  );
}
