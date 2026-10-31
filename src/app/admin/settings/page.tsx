import { ExternalLink, QrCode } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { CopyButton } from "@/components/copy-button";
import { ImageUploadField } from "@/components/image-upload-field";
import { LocationPickerLoader } from "@/components/location-picker-loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireTenantRole } from "@/lib/guards";
import { appBaseUrl } from "@/lib/notifications";
import { getTenantById } from "@/lib/tenancy";
import { getTheme } from "@/lib/themes";
import {
  setTenantImage,
  updateAppearance,
  updateContact,
  updateReminders,
} from "./actions";
import { SettingsTabs } from "./settings-tabs";
import { ThemePicker } from "./theme-picker";

export const metadata = { title: "Configuración · BarberDesk" };

const TABS = ["pagina", "contacto", "recordatorios"] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { tab } = await searchParams;
  const tenant = await getTenantById(ctx.tenantId);
  if (!tenant) return null;
  const publicUrl = `${appBaseUrl()}/b/${tenant.slug}`;
  const activeTab = TABS.find((t) => t === tab) ?? "pagina";
  const theme = getTheme(tenant.theme);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Cómo ven tus clientes tu página de reservas y cómo les avisamos de su cita."
        actions={
          <Button asChild variant="outline">
            <a href={`/b/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Ver mi página
            </a>
          </Button>
        }
      />

      <SettingsTabs defaultTab={activeTab}>
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="pagina" className="sm:px-3">
            Tu página
          </TabsTrigger>
          <TabsTrigger value="contacto" className="sm:px-3">
            <span className="sm:hidden">Contacto</span>
            <span className="hidden sm:inline">Contacto y ubicación</span>
          </TabsTrigger>
          <TabsTrigger value="recordatorios" className="sm:px-3">
            Recordatorios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagina" className="flex flex-col gap-6">
          <Card>
            <form action={updateAppearance} className="flex flex-col gap-(--card-spacing)">
              <CardHeader>
                <CardTitle>Tema de tu página</CardTitle>
                <CardDescription>
                  Cómo ven tus clientes tu página de reservas, la reserva y su
                  cita. Tu panel no cambia.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <ThemePicker
                  current={theme.id}
                  tenantName={tenant.name}
                  brandColor={tenant.brandColor}
                  currency={tenant.currency}
                />
                <Separator />
                <FieldGroup>
                  <Field orientation="horizontal">
                    <Switch
                      id="useThemeColor"
                      name="useThemeColor"
                      defaultChecked={tenant.brandColor == null}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="useThemeColor">Usar el color del tema</FieldLabel>
                      <FieldDescription>
                        Apágalo para pintar los botones con el color de tu marca.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                  <Field orientation="horizontal">
                    <input
                      id="brandColor"
                      name="brandColor"
                      type="color"
                      defaultValue={tenant.brandColor ?? theme.accent}
                      className="h-10 w-16 shrink-0 cursor-pointer rounded-lg border bg-card p-1"
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="brandColor">Color de tu marca</FieldLabel>
                      <FieldDescription>
                        Pinta el botón de reservar, los horarios elegidos y el
                        encabezado de tus correos. El texto encima se ajusta solo
                        para que se lea.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-end">
                <SubmitButton>Guardar tema y color</SubmitButton>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo y portada</CardTitle>
              <CardDescription>
                Se usan en tu página de reservas y en los correos a tus
                clientes. Se guardan en cuanto las subes, sin tocar Guardar.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <ImageUploadField
                label="Logo"
                tenantId={ctx.tenantId}
                currentUrl={tenant.logoUrl}
                previewClassName="h-16 w-16 rounded-full border object-cover"
                help="Imagen cuadrada. PNG, JPG o WEBP, máx. 10 MB."
                onUpload={setTenantImage.bind(null, "logoUrl")}
              />
              <ImageUploadField
                label="Portada"
                tenantId={ctx.tenantId}
                currentUrl={tenant.coverImageUrl}
                previewClassName="h-16 w-28 rounded-lg border object-cover"
                help="Imagen ancha del local o del equipo, arriba de tu página de reservas."
                onUpload={setTenantImage.bind(null, "coverImageUrl")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparte tu barbería</CardTitle>
              <CardDescription>
                Pon el enlace en tu Instagram o WhatsApp. El código QR se puede
                mostrar en una pantalla del local o imprimir, y no pide iniciar
                sesión.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">
                {publicUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={publicUrl} />
                <Button asChild variant="outline">
                  <a href={`/b/${tenant.slug}/qr`} target="_blank" rel="noopener noreferrer">
                    <QrCode /> Ver código QR
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacto">
          <Card>
            <form action={updateContact} className="flex flex-col gap-(--card-spacing)">
              <CardHeader>
                <CardTitle>Contacto y ubicación</CardTitle>
                <CardDescription>
                  Se muestran en tu página de reservas para que el cliente sepa
                  dónde encontrarte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="55 1234 5678"
                        defaultValue={tenant.phone ?? ""}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="address">Dirección</FieldLabel>
                      <Input
                        id="address"
                        name="address"
                        placeholder="Calle 123, Col. Centro, Ciudad"
                        defaultValue={tenant.address ?? ""}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Ubicación en el mapa</FieldLabel>
                    <LocationPickerLoader
                      initialLat={tenant.lat}
                      initialLng={tenant.lng}
                      latName="lat"
                      lngName="lng"
                    />
                    <FieldDescription>
                      Con el pin guardado, tu barbería aparece en el buscador de
                      barberías cercanas y el botón &quot;Cómo llegar&quot; usa el
                      pin en lugar de la dirección. El mapa es de OpenStreetMap y
                      no tiene costo.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-end">
                <SubmitButton>Guardar contacto y ubicación</SubmitButton>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="recordatorios">
          <Card>
            <form action={updateReminders} className="flex flex-col gap-(--card-spacing)">
              <CardHeader>
                <CardTitle>Recordatorios</CardTitle>
                <CardDescription>
                  Le avisan al cliente antes de su cita para reducir las faltas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field orientation="horizontal">
                    <Switch
                      id="reminder24hEnabled"
                      name="reminder24hEnabled"
                      defaultChecked={tenant.reminder24hEnabled}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="reminder24hEnabled">24 horas antes</FieldLabel>
                      <FieldDescription>Un día antes, para que confirme o reprograme a tiempo.</FieldDescription>
                    </FieldContent>
                  </Field>
                  <Field orientation="horizontal">
                    <Switch
                      id="reminder2hEnabled"
                      name="reminder2hEnabled"
                      defaultChecked={tenant.reminder2hEnabled}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="reminder2hEnabled">2 horas antes</FieldLabel>
                      <FieldDescription>El último aviso, justo antes de salir.</FieldDescription>
                    </FieldContent>
                  </Field>
                  <Separator />
                  <Field orientation="horizontal">
                    <Switch
                      id="whatsappEnabled"
                      name="whatsappEnabled"
                      defaultChecked={tenant.whatsappEnabled}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="whatsappEnabled">Enviar por WhatsApp</FieldLabel>
                      <FieldDescription>
                        Requiere una cuenta de WhatsApp Business (Meta)
                        verificada. Mientras no esté configurada, o si un envío
                        falla, el recordatorio sale por correo: puedes dejarlo
                        activado desde ya.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-end">
                <SubmitButton>Guardar recordatorios</SubmitButton>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </SettingsTabs>
    </div>
  );
}
