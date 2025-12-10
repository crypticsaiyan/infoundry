import Head from "next/head";
import styles from "../styles/Home.module.css";

const highlights = [
  "Repo analyzer → Kestra summaries → Oumi decisions",
  "Cline-generated IaC PRs reviewed by CodeRabbit",
  "Test deploys on localstack/kind with smoke + load",
  "Human-in-the-loop approvals and before/after charts"
];

export default function Home() {
  return (
    <>
      <Head>
        <title>CloudGenesis</title>
        <meta name="description" content="Cloud architect + SRE agent" />
      </Head>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1>CloudGenesis</h1>
          <p className={styles.tagline}>
            Self-adaptive cloud architect that plans, tests, and proposes IaC safely.
          </p>
          <div className={styles.grid}>
            {highlights.map((item) => (
              <div key={item} className="card">
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <a className={styles.button} href="https://vercel.com">
              Deploy Preview (stub)
            </a>
            <a className={styles.link} href="https://github.com/your-org/cloudgenesis">
              View on GitHub
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

