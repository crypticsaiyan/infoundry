"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import styles from "./Header.module.css";

/**
 * Site header component with logo, desktop navigation, auth actions, and a toggleable mobile menu.
 *
 * The component displays navigation links, a "Get Started" action, and a mobile menu that opens and closes
 * via a toggle button (the mobile menu closes when a mobile nav link is clicked). The mobile toggle button
 * includes an accessible `aria-label`.
 *
 * @returns {JSX.Element} The header element containing the responsive navigation UI.
 */
export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Pipeline", href: "/pipeline" },
    { name: "Configure", href: "/configure" },
    { name: "Dashboard", href: "/dashboard" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2" />
              <rect x="7" y="7" width="6" height="6" fill="currentColor" />
            </svg>
          </div>
          <span className={styles.logoText}>InFoundry</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link key={link.name} href={link.href} className={styles.navLink}>
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className={styles.authButtons}>
          <Link href="/dashboard" className={styles.getStartedBtn}>
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <nav className={styles.mobileNav}>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={styles.mobileNavLink}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className={styles.mobileAuthButtons}>
              <Link href="/dashboard" className={styles.mobileGetStartedBtn}>
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}