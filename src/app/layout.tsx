import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Parth OS",
  description: "Parth's personal assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
