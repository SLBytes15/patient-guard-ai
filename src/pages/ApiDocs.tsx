import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const endpoints = [
  {
    method: "POST", path: "/api/check-interactions",
    desc: "Analyze medications for drug interactions and patient-condition safety.",
    body: `{
  "medications": [{ "name": "Warfarin" }, { "name": "Aspirin" }],
  "abha_id": "ABHA001"
}`,
    response: `{
  "interactions": [...],
  "condition_warnings": [
    { "drug": "ibuprofen", "condition": "kidney disease", "risk": "HIGH", "reason": "..." }
  ],
  "overall_risk": "HIGH"
}`,
  },
  {
    method: "POST", path: "/api/auth/login",
    desc: "Authenticate and receive a JWT token.",
    body: `{ "email": "user@example.com", "password": "securepassword" }`,
    response: `{ "token": "jwt...", "expiresIn": 3600 }`,
  },
];

const methodColors: Record<string, string> = { GET: "bg-success/15 text-success", POST: "bg-secondary/15 text-secondary" };

export default function ApiDocs() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-16 max-w-4xl">
        <h1 className="font-display text-4xl font-bold mb-2">API Documentation</h1>
        <p className="text-muted-foreground mb-12">Integrate RxSense into your healthcare systems with our REST API.</p>
        <div className="space-y-6">
          {endpoints.map((ep) => (
            <div key={ep.path + ep.method} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColors[ep.method]}`}>{ep.method}</span>
                <code className="text-sm font-medium">{ep.path}</code>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">{ep.desc}</p>
                {ep.body && (
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Body</span>
                    <pre className="mt-1 bg-muted rounded-lg p-3 text-xs overflow-x-auto"><code>{ep.body}</code></pre>
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Response</span>
                  <pre className="mt-1 bg-muted rounded-lg p-3 text-xs overflow-x-auto"><code>{ep.response}</code></pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
