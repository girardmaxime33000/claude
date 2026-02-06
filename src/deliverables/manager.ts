import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Deliverable } from "../config/types.js";

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

/**
 * Manages the production of deliverables from agent results.
 * Supports: local documents, GitHub PRs, review requests.
 */
export class DeliverableManager {
  private github: GitHubConfig;
  private outputDir: string;

  constructor(github: GitHubConfig, outputDir: string = "./output") {
    this.github = github;
    this.outputDir = outputDir;
  }

  /** Produce a deliverable and return its URL/path */
  async produce(deliverable: Deliverable): Promise<string> {
    switch (deliverable.type) {
      case "document":
      case "report":
        return this.writeDocument(deliverable);
      case "pull_request":
        return this.createPullRequest(deliverable);
      case "review_request":
        return this.createReviewRequest(deliverable);
      case "campaign_config":
        return this.writeCampaignConfig(deliverable);
      default:
        return this.writeDocument(deliverable);
    }
  }

  /** Write a document/report to the local filesystem */
  private async writeDocument(deliverable: Deliverable): Promise<string> {
    const filePath = resolve(this.outputDir, deliverable.location);
    await mkdir(dirname(filePath), { recursive: true });

    const header = `# ${deliverable.title}

> Généré par **${deliverable.metadata.agent}** le ${deliverable.metadata.generatedAt}
> Domaine : ${deliverable.metadata.domain} | Tâche : ${deliverable.metadata.taskId}

---

`;
    await writeFile(filePath, header + deliverable.content, "utf-8");
    console.log(`   📄 Document written: ${filePath}`);
    return filePath;
  }

  /** Create a GitHub Pull Request with the deliverable content */
  private async createPullRequest(deliverable: Deliverable): Promise<string> {
    const branchName = deliverable.location; // e.g., "feature/seo-audit"
    const { owner, repo, token } = this.github;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // 1. Get default branch ref
    const repoRes = await fetch(apiBase, { headers });
    const repoData = (await repoRes.json()) as { default_branch: string };
    const defaultBranch = repoData.default_branch;

    const refRes = await fetch(
      `${apiBase}/git/ref/heads/${defaultBranch}`,
      { headers }
    );
    const refData = (await refRes.json()) as { object: { sha: string } };
    const baseSha = refData.object.sha;

    // 2. Create branch
    await fetch(`${apiBase}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });

    // 3. Create/update file on the branch
    const filePath = `deliverables/${deliverable.metadata.domain}/${deliverable.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    const content = Buffer.from(deliverable.content).toString("base64");

    await fetch(`${apiBase}/contents/${filePath}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `[AI Agent] ${deliverable.title}`,
        content,
        branch: branchName,
      }),
    });

    // 4. Create Pull Request
    const prRes = await fetch(`${apiBase}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `[${deliverable.metadata.domain.toUpperCase()}] ${deliverable.title}`,
        body: `## 🤖 Livrable automatique

**Agent** : ${deliverable.metadata.agent}
**Domaine** : ${deliverable.metadata.domain}
**Tâche** : ${deliverable.metadata.taskId}

---

${deliverable.content.slice(0, 500)}...

---
*Ce PR a été créé automatiquement par le système d'agents marketing IA.*`,
        head: branchName,
        base: defaultBranch,
      }),
    });

    const prData = (await prRes.json()) as { html_url: string };
    console.log(`   🔀 Pull Request created: ${prData.html_url}`);
    return prData.html_url;
  }

  /** Create a review request (issue + assignment) */
  private async createReviewRequest(
    deliverable: Deliverable
  ): Promise<string> {
    const { owner, repo, token } = this.github;

    // First write the document locally
    const docPath = await this.writeDocument(deliverable);

    // Then create a GitHub issue for review
    const issueRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `[Review] ${deliverable.title}`,
          body: `## 📋 Demande de review

**Agent** : ${deliverable.metadata.agent}
**Domaine** : ${deliverable.metadata.domain}
**Document** : \`${docPath}\`

### Résumé
${deliverable.content.slice(0, 1000)}

---
*Merci de relire ce livrable et de valider ou demander des modifications.*`,
          labels: ["review", deliverable.metadata.domain],
        }),
      }
    );

    const issueData = (await issueRes.json()) as { html_url: string };
    console.log(`   📝 Review request created: ${issueData.html_url}`);
    return issueData.html_url;
  }

  /** Write a campaign configuration file (JSON) */
  private async writeCampaignConfig(
    deliverable: Deliverable
  ): Promise<string> {
    const filePath = resolve(this.outputDir, deliverable.location);
    await mkdir(dirname(filePath), { recursive: true });

    // Try to parse content as JSON, otherwise wrap it
    let jsonContent: string;
    try {
      JSON.parse(deliverable.content);
      jsonContent = deliverable.content;
    } catch {
      jsonContent = JSON.stringify(
        {
          title: deliverable.title,
          generatedBy: deliverable.metadata.agent,
          generatedAt: deliverable.metadata.generatedAt,
          config: deliverable.content,
        },
        null,
        2
      );
    }

    await writeFile(filePath, jsonContent, "utf-8");
    console.log(`   ⚙️ Campaign config written: ${filePath}`);
    return filePath;
  }
}
