/**
 * Root layout. Renders a plain passthrough — the full document (`<html lang dir>`)
 * is provided by the `[locale]` layout so direction stays in sync with the URL
 * locale and no cookie is needed on first paint.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}