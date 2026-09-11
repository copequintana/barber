import { DEFAULT_BRAND_COLOR, getTenantBySlug } from "@/lib/tenancy";

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

  return (
    <div
      style={{ "--brand": tenant.brandColor ?? DEFAULT_BRAND_COLOR } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
