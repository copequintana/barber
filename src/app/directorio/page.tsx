import { redirect } from "next/navigation";

// El directorio ahora vive en la raíz (/) — este redirect es solo para no
// romper el link si ya lo compartiste con alguien.
export default function DirectorioRedirect() {
  redirect("/");
}
