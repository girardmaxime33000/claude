import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Deliverable } from "../config/types.js";
import { safePath, safeSlug } from "../utils/sanitizer.js";
import { secureFetchOk } from "../utils/http.js";

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

/**
 * Manages the production of deliverables from agent results.
 * Supports: local documents, GitHub PRs, review requests.
 *
 * SECURITY patches applied:
 * - CRITIQUE-02: Path traversal protection via safePath()
 * - HAUTE-04: All GitHub API responses are verified
 * - HAUTE-05: All HTTP requests have timeouts via secureFetchOk()
 */
export class DeliverableManager {
  private github: GitHubConfig;
  private outputDir: string;

  constructor(github: GitHubConfig, outputDir: string = "./output") {
    this.github = github;
    this.outputDir = resolve(outputDir);
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

  /**
   * Write a document/report to the local filesystem.
   * SECURITY: Path traversal protection (CRITIQUE-02).
   */
  private async writeDocument(deliverable: Deliverable): Promise<string> {
    const filePath = safePath(this.outputDir, deliverable.location);
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

  /**
   * Create a GitHub Pull Request with the deliverable content.
   * SECURITY: All responses verified (HAUTE-04), timeouts enforced (HAUTE-05).
   */
  private async createPullRequest(deliverable: Deliverable): Promise<string> {
    const branchName = deliverable.location; // e.g., "feature/seo-audit"
    const { owner, repo, token } = this.github;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // 1. Get default branch ref (HAUTE-04: response verified)
    const repoRes = await secureFetchOk(apiBase, { headers });
    const repoData = (await repoRes.json()) as { default_branch?: string };
    const defaultBranch = repoData.default_branch;
    if (!defaultBranch) {
      throw new Error(
        `GitHub API: impossible de determiner la branche par defaut du repo ${owner}/${repo}`
      );
    }

    const refRes = await secureFetchOk(
      `${apiBase}/git/ref/heads/${defaultBranch}`,
      { headers }
    );
    const refData = (await refRes.json()) as {
      object?: { sha?: string };
    };
    const baseSha = refData.object?.sha;
    if (!baseSha) {
      throw new Error(
        `GitHub API: impossible de recuperer le SHA de la branche '${defaultBranch}' pour ${owner}/${repo}. ` +
          `Verifiez que le repository existe et n'est pas vide.`
      );
    }

    // 2. Create branch (HAUTE-04: response verified)
    await secureFetchOk(`${apiBase}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });

    // 3. Create/update file on the branch (HAUTE-04: response verified)
    const slug = safeSlug(deliverable.title);
    const filePath = `deliverables/${deliverable.metadata.domain}/${slug}.md`;
    const content = Buffer.from(deliverable.content).toString("base64");

    await secureFetchOk(`${apiBase}/contents/${filePath}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `[AI Agent] ${deliverable.title}`,
        content,
        branch: branchName,
      }),
    });

    // 4. Create Pull Request (HAUTE-04: response verified)
    const prRes = await secureFetchOk(`${apiBase}/pulls`, {
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

  /**
   * Create a review request (issue + assignment).
   * SECURITY: Response verified (HAUTE-04), path protected (CRITIQUE-02).
   */
  private async createReviewRequest(
    deliverable: Deliverable
  ): Promise<string> {
    const { owner, repo, token } = this.github;

    // First write the document locally
    const docPath = await this.writeDocument(deliverable);

    // Then create a GitHub issue for review (HAUTE-04: response verified)
    const issueRes = await secureFetchOk(
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

  /**
   * Write a campaign configuration file (JSON).
   * SECURITY: Path traversal protection (CRITIQUE-02).
   */
  private async writeCampaignConfig(
    deliverable: Deliverable
  ): Promise<string> {
    const filePath = safePath(this.outputDir, deliverable.location);
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
