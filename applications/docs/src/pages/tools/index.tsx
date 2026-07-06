import Link from "@docusaurus/Link"
import Layout from "@theme/Layout"
import React from "react"

import styles from "./index.module.css"

const tools = [
  {
    title: "OPDS 2.0 Validator",
    description:
      "Validate your OPDS 2.0 catalog feed against the specification. Upload a JSON file or fetch from a URL to see validation errors and a preview of your feed.",
    href: "/tools/opds-validator",
  },
]

export default function ToolsPage(): JSX.Element {
  return (
    <Layout
      title="Tools"
      description="Browser-based tools for working with OPDS feeds and ebook standards"
    >
      <main className="container">
        <div className={styles.page}>
          <header className={styles.header}>
            <h1>Tools</h1>
            <p className={styles.description}>
              Browser-based tools for working with OPDS feeds and ebook
              standards. Everything runs locally in your browser.
            </p>
          </header>

          <div className={styles.grid}>
            {tools.map((tool) => (
              <Link key={tool.href} to={tool.href} className={styles.card}>
                <div className="card">
                  <div className="card__header">
                    <h3>{tool.title}</h3>
                  </div>
                  <div className="card__body">
                    <p>{tool.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  )
}
