import "./globals.css";

export const metadata = {
  title: "Daily Frame",
  description: "One day. One prompt. One photo."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
