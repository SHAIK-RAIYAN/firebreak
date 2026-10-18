"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RepoItem {
  installationRowId: string;
  githubInstallationId: number;
  id: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
}

interface VercelProjectItem {
  id: string;
  name: string;
  framework?: string | null;
  link?: {
    type: string;
    org?: string;
    repo?: string;
    productionBranch?: string;
  } | null;
  productionUrl?: string | null;
}

interface HealthCheckResult {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  observedSha: string | null;
  error: string | null;
}

export default function NewServicePage() {
  const router = useRouter();

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [projects, setProjects] = useState<VercelProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wizard form state
  const [selectedRepoFull, setSelectedRepoFull] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [productionBranch, setProductionBranch] = useState("main");
  const [healthUrl, setHealthUrl] = useState("");
  const [expectedStatus, setExpectedStatus] = useState(200);

  // Health probe test state
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<HealthCheckResult | null>(null);

  // Creation result state (holds alert secret shown once)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [reposRes, projectsRes] = await Promise.all([
          fetch("/api/v1/integrations/github/repos"),
          fetch("/api/v1/integrations/vercel/projects"),
        ]);

        if (!reposRes.ok) throw new Error("Please connect GitHub first");
        if (!projectsRes.ok) throw new Error("Please connect Vercel first");

        const reposJson = await reposRes.json();
        const projectsJson = await projectsRes.json();

        const repoList: RepoItem[] = reposJson.data?.repos || [];
        const projectList: VercelProjectItem[] = projectsJson.data?.projects || [];

        setRepos(repoList);
        setProjects(projectList);

        if (repoList.length > 0 && repoList[0]) {
          const first = repoList[0];
          setSelectedRepoFull(first.fullName);
          setServiceName(first.name);
          setProductionBranch(first.defaultBranch || "main");

          // Auto-match Vercel project
          const match = projectList.find(
            (p) => p.name.toLowerCase() === first.name.toLowerCase() || p.link?.repo === first.name,
          );
          if (match) {
            setSelectedProjectId(match.id);
            if (match.productionUrl) {
              setHealthUrl(`https://${match.productionUrl}/api/health`);
            }
          }
        }
      } catch (err) {
        setErrorMsg((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function handleRepoChange(fullName: string) {
    setSelectedRepoFull(fullName);
    const repo = repos.find((r) => r.fullName === fullName);
    if (repo) {
      setServiceName(repo.name);
      setProductionBranch(repo.defaultBranch || "main");

      // Attempt auto-match
      const match = projects.find(
        (p) => p.name.toLowerCase() === repo.name.toLowerCase() || p.link?.repo === repo.name,
      );
      if (match) {
        setSelectedProjectId(match.id);
        if (match.productionUrl) {
          setHealthUrl(`https://${match.productionUrl}/api/health`);
        }
      }
    }
  }

  async function handleTestHealth() {
    if (!healthUrl.trim()) return;
    setProbing(true);
    setProbeResult(null);

    try {
      const res = await fetch("/api/v1/services/health-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: healthUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Health check failed");
      setProbeResult(json.data);
    } catch (err) {
      setProbeResult({
        ok: false,
        httpStatus: null,
        latencyMs: null,
        observedSha: null,
        error: (err as Error).message,
      });
    } finally {
      setProbing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const repo = repos.find((r) => r.fullName === selectedRepoFull);
    if (!repo) return;

    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/services", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: serviceName.trim(),
            githubInstallationId: repo.installationRowId,
            repoOwner: repo.owner,
            repoName: repo.name,
            productionBranch,
            vercelProjectId: selectedProjectId,
            healthUrl: healthUrl.trim(),
            healthExpectedStatus: expectedStatus,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to create service");
        }

        setCreatedSecret(json.data.alertSecret);
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    });
  }

  function copySecret() {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (createdSecret) {
    return (
      <div className="min-h-screen bg-(--bg) text-(--fg) p-8">
        <div className="max-w-xl mx-auto space-y-6 pt-12">
          <div className="p-8 bg-(--bg-raised) border border-(--ok)/40 rounded-xl space-y-6 shadow-sm">
            <div className="space-y-2">
              <span className="px-2.5 py-1 bg-(--ok)/20 text-(--ok) text-xs font-semibold rounded-full">
                Service Created
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Save your Alert Secret</h1>
              <p className="text-sm text-(--fg-muted)">
                This secret is required to sign webhook alerts sent to Firebreak. It will{" "}
                <strong className="text-(--danger)">never be shown again</strong>.
              </p>
            </div>

            <div className="p-4 bg-(--surface) border border-(--line) rounded-lg font-mono text-sm break-all flex items-center justify-between">
              <span>{createdSecret}</span>
              <button
                onClick={copySecret}
                className="ml-4 px-3 py-1.5 bg-(--fg) text-(--bg) text-xs font-medium rounded-md hover:opacity-90 shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push("/app")}
                className="w-full px-4 py-2 bg-(--accent-solid) text-(--accent-fg) font-medium text-sm rounded-md hover:opacity-90 transition"
              >
                Go to Console &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg) text-(--fg) p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="border-b border-(--line) pb-4">
          <div className="flex items-center space-x-2 text-sm text-(--fg-muted) mb-1">
            <Link href="/app" className="hover:text-(--fg)">
              Console
            </Link>
            <span>/</span>
            <span>Services</span>
            <span>/</span>
            <span>New</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Connect New Service</h1>
          <p className="text-sm text-(--fg-muted) mt-1">
            Pair a GitHub repository with its Vercel production deployment.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-(--danger)/10 border border-(--danger)/30 rounded-lg text-sm text-(--danger) flex items-center justify-between">
            <span>{errorMsg}</span>
            <Link href="/app/integrations" className="underline font-medium">
              Manage Integrations &rarr;
            </Link>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-(--fg-muted)">Loading available repositories and projects...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 bg-(--bg-raised) border border-(--line) rounded-xl space-y-6">
            {/* Step 1: GitHub Repo */}
            <div>
              <label className="block text-sm font-medium mb-1">1. GitHub Repository</label>
              <Select value={selectedRepoFull} onValueChange={handleRepoChange}>
                <SelectTrigger className="w-full h-10 px-3 bg-(--surface) border-(--line) text-sm">
                  <SelectValue placeholder="Select repository..." />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((r) => (
                    <SelectItem key={r.id} value={r.fullName}>
                      {r.fullName} ({r.defaultBranch})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {repos.length === 0 && (
                <p className="text-xs text-(--warn) mt-1">
                  No repositories found.{" "}
                  <Link href="/app/integrations" className="underline">
                    Connect GitHub
                  </Link>
                </p>
              )}
            </div>

            {/* Step 2: Vercel Project */}
            <div>
              <label className="block text-sm font-medium mb-1">2. Vercel Project</label>
              <Select
                value={selectedProjectId}
                onValueChange={(val) => {
                  setSelectedProjectId(val);
                  const p = projects.find((proj) => proj.id === val);
                  if (p?.productionUrl) {
                    setHealthUrl(`https://${p.productionUrl}/api/health`);
                  }
                }}
              >
                <SelectTrigger className="w-full h-10 px-3 bg-(--surface) border-(--line) text-sm">
                  <SelectValue placeholder="Select Vercel project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.link?.repo ? `(linked to ${p.link.repo})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-xs text-(--warn) mt-1">
                  No Vercel projects found.{" "}
                  <Link href="/app/integrations" className="underline">
                    Connect Vercel
                  </Link>
                </p>
              )}
            </div>

            {/* Step 3: Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-(--surface) border border-(--line) rounded-md text-sm focus:outline-none focus:border-(--accent)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Production Branch</label>
                <input
                  type="text"
                  value={productionBranch}
                  onChange={(e) => setProductionBranch(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-(--surface) border border-(--line) rounded-md text-sm focus:outline-none focus:border-(--accent)"
                />
              </div>
            </div>

            {/* Step 4: Health Check URL */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Health Check URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={healthUrl}
                      onChange={(e) => setHealthUrl(e.target.value)}
                      placeholder="https://your-domain.vercel.app/api/health"
                      required
                      className="flex-1 px-3 py-2 bg-(--surface) border border-(--line) rounded-md text-sm font-mono focus:outline-none focus:border-(--accent)"
                    />
                    <button
                      type="button"
                      onClick={handleTestHealth}
                      disabled={probing || !healthUrl}
                      className="px-4 py-2 bg-(--surface) border border-(--line-strong) text-sm font-medium rounded-md hover:bg-(--line) transition disabled:opacity-50"
                    >
                      {probing ? "Testing..." : "Test"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expected Status</label>
                  <input
                    type="number"
                    value={expectedStatus}
                    onChange={(e) => setExpectedStatus(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-(--surface) border border-(--line) rounded-md text-sm font-mono focus:outline-none focus:border-(--accent)"
                  />
                </div>
              </div>

              {/* Probe Result Card */}
              {probeResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    probeResult.ok
                      ? "bg-(--ok)/10 border-(--ok)/30 text-(--ok)"
                      : "bg-(--danger)/10 border-(--danger)/30 text-(--danger)"
                  }`}
                >
                  <div>
                    <span className="font-bold">{probeResult.ok ? "✓ Healthy" : "✗ Unhealthy"}</span> — HTTP{" "}
                    {probeResult.httpStatus ?? "None"} ({probeResult.latencyMs}ms)
                    {probeResult.error && <span> &bull; Error: {probeResult.error}</span>}
                  </div>
                  {probeResult.observedSha && (
                    <span className="bg-(--surface) px-2 py-0.5 rounded text-(--fg) border border-(--line)">
                      SHA: {probeResult.observedSha.slice(0, 7)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-(--line) flex justify-end space-x-3">
              <Link
                href="/app"
                className="px-4 py-2 bg-(--surface) text-sm font-medium rounded-md hover:bg-(--line) transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isPending || repos.length === 0 || projects.length === 0}
                className="px-5 py-2 bg-(--accent-solid) text-(--accent-fg) font-medium text-sm rounded-md hover:opacity-90 transition disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Service"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
