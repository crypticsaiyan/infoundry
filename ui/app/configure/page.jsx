"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceConfigGenerator from "@/components/ServiceConfigGenerator";
import styles from "./page.module.css";

export default function ConfigurePage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Configure Your Services</h1>
            <p className={styles.description}>
              Manually specify your project&apos;s services, technologies, and infrastructure. 
              Download the configuration file and add it to your repository for the InFoundry pipeline to use.
            </p>
          </div>
          
          <ServiceConfigGenerator />
        </div>
      </main>
      <Footer />
    </>
  );
}
