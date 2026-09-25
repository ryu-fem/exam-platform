/**
 * Root layout. Renders a plain passthrough — the full document (`<html lang dir>`)
 * is provided by the `[locale]` layout so direction stays in sync with the URL
 * locale and no cookie is needed on first paint.
 *
 * The global stylesheet is imported HERE — at the very top of the app shell —
 * so the CSS sheet lands in the document head and is ready at the moment the
 * server stream hands over to the client (the hydration boundary). Next.js
 * hoists it into `<head>` ahead of the locale subtree, giving the layout its
 * styling the instant it renders with no flash of unstyled content.
 */
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}