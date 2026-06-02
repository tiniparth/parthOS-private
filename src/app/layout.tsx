export const metadata = {
  title: "Parth OS",
  description: "Parth's personal assistant — engine room",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0, background: "#0b0b0c", color: "#e8e8ea" }}>
        {children}
      </body>
    </html>
  );
}
