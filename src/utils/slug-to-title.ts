
export function slugToTitle(url: string): string {
  const slug = url.split("/").filter(Boolean).pop() ?? "";

  const conEspacios = slug.replace(/-/g, " ");

  const frase =
    conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1).toLowerCase();

  return frase;
}