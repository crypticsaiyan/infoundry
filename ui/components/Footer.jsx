import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: "Solutions", href: "#solutions" },
      { name: "Use Cases", href: "#use-cases" },
      { name: "Pricing", href: "#pricing" },
      { name: "Changelog", href: "#changelog" },
    ],
    developers: [
      { name: "Documentation", href: "#docs" },
      { name: "API Reference", href: "#api" },
      { name: "GitHub", href: "https://github.com" },
      { name: "Discord", href: "#discord" },
    ],
    company: [
      { name: "About", href: "#about" },
      { name: "Blog", href: "#blog" },
      { name: "Careers", href: "#careers" },
      { name: "Contact", href: "#contact" },
    ],
    legal: [
      { name: "Privacy", href: "#privacy" },
      { name: "Terms", href: "#terms" },
      { name: "Security", href: "#security" },
    ],
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2" />
                  <rect x="7" y="7" width="6" height="6" fill="currentColor" />
                </svg>
              </div>
              <span className={styles.logoText}>InFoundry</span>
            </Link>
            <p className={styles.tagline}>
              AI-powered cloud architecture for modern teams.
            </p>
          </div>

          {/* Links */}
          <div className={styles.links}>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Product</h4>
              {footerLinks.product.map((link) => (
                <Link key={link.name} href={link.href} className={styles.link}>
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Developers</h4>
              {footerLinks.developers.map((link) => (
                <Link key={link.name} href={link.href} className={styles.link}>
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Company</h4>
              {footerLinks.company.map((link) => (
                <Link key={link.name} href={link.href} className={styles.link}>
                  {link.name}
                </Link>
              ))}
            </div>

            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Legal</h4>
              {footerLinks.legal.map((link) => (
                <Link key={link.name} href={link.href} className={styles.link}>
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {currentYear} InFoundry. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
