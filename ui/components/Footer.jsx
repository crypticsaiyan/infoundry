import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
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
            <Link href="/pipeline" className={styles.link}>Pipeline</Link>
            <Link href="/dashboard" className={styles.link}>Dashboard</Link>
            <a href="https://github.com/crypticsaiyan/infoundry" target="_blank" rel="noopener noreferrer" className={styles.link}>
              GitHub
            </a>
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
