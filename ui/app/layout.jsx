import "./globals.css";

export const metadata = {
  title: "InFoundry Architect - AI-Powered Cloud Architecture Generator",
  description: "Design and deploy cloud architectures visually with AI. InFoundry helps teams build infrastructure through intuitive drag-and-drop diagrams that convert to production-ready IaC.",
  keywords: ["cloud architecture", "infrastructure as code", "terraform", "AWS", "AI", "diagram"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
