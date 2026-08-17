export const metadata = {
  title: "SEO Landers, Live Command Center",
  description: "Live SEO ranking data joined with OpenPanel conversion and revenue, per lander.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#131313", color: "#EAEAEA",
        fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
