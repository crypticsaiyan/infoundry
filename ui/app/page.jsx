"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function Home() {

  const useCases = [
    "Cloud Migration",
    "Microservices",
    "Serverless",
    "Event-Driven",
    "Data Pipeline",
    "Kubernetes",
  ];

  const trustedLogos = [
    "TechCorp", "CloudScale", "DevOps Inc", "InfraStack", "ArchiFlow"
  ];

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            {/* Announcement Badge */}
            <div className={styles.announcement}>
              <span className={styles.announcementText}>Introducing InFoundry</span>
              <Link href="/signup" className={styles.announcementCta}>
                Try now <ArrowRight size={14} />
              </Link>
            </div>

            {/* Main Headline */}
            <h1 className={styles.headline}>
              Meet your first<br />
              autonomous architect.
            </h1>

            {/* Subheadline */}
            <p className={styles.subheadline}>
              InFoundry helps teams deploy cloud architectures that plan, design, and scale
              infrastructure — from repos to production — with a single prompt.
            </p>

            {/* Use Case Pills */}
            <div className={styles.useCases}>
              {useCases.map((useCase) => (
                <button key={useCase} className={styles.useCasePill}>
                  {useCase}
                </button>
              ))}
            </div>

            {/* Pipeline CTA */}
            <div className={styles.pipelineCta}>
              <Link href="/pipeline" className={styles.pipelineBtn}>
                <Zap size={18} />
                <span>Try the Pipeline</span>
                <ArrowRight size={16} />
              </Link>
              <p className={styles.pipelineHint}>Run automated IaC generation with Kestra</p>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className={styles.trusted}>
          <h2 className={styles.trustedTitle}>
            Trusted by the teams redefining<br />
            cloud infrastructure
          </h2>
          <div className={styles.trustedLogos}>
            {trustedLogos.map((logo) => (
              <div key={logo} className={styles.trustedLogo}>
                {logo}
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Instant Architecture</h3>
              <p className={styles.featureDesc}>
                From repo to cloud diagram in seconds. Our AI analyzes your codebase and generates optimal infrastructure.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Visual Editor</h3>
              <p className={styles.featureDesc}>
                Drag, drop, and customize your architecture with an intuitive visual canvas. No YAML required.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h3 className={styles.featureTitle}>Production IaC</h3>
              <p className={styles.featureDesc}>
                Export Terraform, Helm, and CDK with built-in best practices. Ready for your CI/CD pipeline.
              </p>
            </div>
          </div>
          
          <div className={styles.configurePromo}>
            <p>Want to configure your services manually?</p>
            <Link href="/configure" className={styles.configureLink}>
              Use the Service Configuration Generator →
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready to architect your cloud?</h2>
          <p className={styles.ctaDesc}>
            Start designing production-ready infrastructure in minutes.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/pipeline" className={styles.ctaPrimary}>
              <Zap size={16} />
              Launch Pipeline
            </Link>
            <Link href="/dashboard" className={styles.ctaSecondary}>
              View Dashboard
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
