import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, FileText, Pill, AlertTriangle, CheckCircle2, Loader2, X, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import {
  parsePrescriptionText as parseRx,
  cleanOcrText,
  type ParsedMedication,
} from "@/services/prescriptionParser";

type ScanStage = "idle" | "preprocessing" | "ocr" | "parsing" | "done";

export default function PrescriptionScanner() {
  const [stage, setStage] = useState<ScanStage>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [medications, setMedications] = useState<ParsedMedication[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const processImage = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStage("preprocessing");
    setMedications([]);
    setRawText("");
    setCleanedText("");

    try {
      setStage("ocr");
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const raw = data.text;
      setRawText(raw);

      setStage("parsing");
      const cleaned = cleanOcrText(raw);
      setCleanedText(cleaned);
      const parsed = parseRx(raw);
      setMedications(parsed);
      setStage("done");

      if (parsed.length === 0) {
        toast({ title: "No medicines detected", description: "Try a clearer image or enter text manually.", variant: "destructive" });
      } else {
        toast({ title: `${parsed.length} medicine(s) detected`, description: "Review below and send to Analyzer." });
      }
    } catch (err) {
      toast({ title: "OCR failed", description: "Could not process image. Try entering text manually.", variant: "destructive" });
      setStage("idle");
    }
  };

  const processManualText = () => {
    if (!manualText.trim()) return;
    setRawText(manualText);
    const cleaned = cleanOcrText(manualText);
    setCleanedText(cleaned);
    const parsed = parseRx(manualText);
    setMedications(parsed);
    setStage("done");
    if (parsed.length === 0) {
      toast({ title: "No medicines detected", description: "Try different medicine names.", variant: "destructive" });
    }
  };

  const removeMed = (idx: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const sendToAnalyzer = () => {
    if (medications.length === 0) return;
    const drugNames = medications.map((m) => m.drug);
    navigate("/analyzer", { state: { prefillDrugs: drugNames } });
  };

  const reset = () => {
    setStage("idle");
    setImageUrl(null);
    setRawText("");
    setCleanedText("");
    setMedications([]);
    setManualMode(false);
    setManualText("");
  };

  const stageLabel: Record<ScanStage, string> = {
    idle: "", preprocessing: "Preparing image...", ocr: "Running OCR...",
    parsing: "Detecting medicines...", done: "Complete",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container text-center max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-4">
              <Camera className="h-4 w-4" /><span>Prescription Scanner</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Scan & Detect Medicines</h1>
            <p className="text-base text-white/70 max-w-xl mx-auto">
              Upload a prescription image or type text — detected medicines are sent directly to the Analyzer.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Input Section */}
          {stage === "idle" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card shadow-card p-6">

              {!manualMode ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="font-display text-lg font-semibold mb-2">Upload Prescription</h2>
                    <p className="text-sm text-muted-foreground">Upload an image of a prescription for OCR-based medicine detection</p>
                  </div>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-secondary/50 hover:bg-muted/30 transition-all"
                  >
                    <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP supported</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) processImage(f); }} />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={() => setManualMode(true)}>
                    <FileText className="h-4 w-4" /> Enter Prescription Text Manually
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold">Enter Prescription Text</h2>
                    <button onClick={() => setManualMode(false)} className="text-sm text-muted-foreground hover:text-foreground">← Back to upload</button>
                  </div>
                  <Textarea
                    placeholder={"Paste or type prescription text here...\n\nExample:\nDolo 650 tab OD\nPan 40 tab BD\nAmoxicillin 500mg TDS"}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="min-h-[160px] font-mono text-sm"
                  />
                  <Button onClick={processManualText} disabled={!manualText.trim()} className="w-full gradient-primary border-0 gap-2">
                    <Zap className="h-4 w-4" /> Detect Medicines
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Processing State */}
          {(stage === "preprocessing" || stage === "ocr" || stage === "parsing") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl border border-border bg-card shadow-card p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto mb-3" />
              <p className="font-display font-semibold">{stageLabel[stage]}</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
              {imageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden border border-border max-w-xs mx-auto">
                  <img src={imageUrl} alt="Prescription" className="w-full" />
                </div>
              )}
            </motion.div>
          )}

          {/* Results */}
          {stage === "done" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Detected Medicines */}
              <div className="rounded-2xl border border-border bg-card shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-secondary" />
                    <h2 className="font-display text-lg font-semibold">Detected Medicines</h2>
                    <Badge variant="secondary" className="text-xs">{medications.length}</Badge>
                  </div>
                  <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">Scan Again</button>
                </div>

                {medications.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-6 w-6 text-warning mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No medicines detected. Try a clearer image or manual entry.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={reset}>Try Again</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {medications.map((med, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            med.confidence >= 0.8 ? "bg-success/15 text-success" : med.confidence >= 0.5 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                          }`}>
                            {Math.round(med.confidence * 100)}%
                          </div>
                          <div>
                            <span className="text-sm font-medium capitalize">{med.drug}</span>
                            {med.generic && <span className="text-xs text-muted-foreground ml-2">({med.generic})</span>}
                            <div className="flex gap-1.5 mt-0.5">
                              {med.dosage && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{med.dosage}</span>}
                              {med.frequency && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{med.frequency}</span>}
                              {med.form && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{med.form}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeMed(i)} className="p-1 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Send to Analyzer button */}
                {medications.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <Button onClick={sendToAnalyzer} className="w-full gradient-primary border-0 gap-2 h-11">
                      <ArrowRight className="h-4 w-4" /> Send to Analyzer &amp; Check Safety
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      Detected medicines will be auto-filled in the Analyzer page
                    </p>
                  </div>
                )}
              </div>

              {/* Raw OCR Text (collapsible) */}
              {rawText && (
                <details className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                  <summary className="p-4 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    View Raw OCR Text
                  </summary>
                  <div className="px-4 pb-4">
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{rawText}</pre>
                  </div>
                </details>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">
                  ⚠️ <strong>Disclaimer:</strong> OCR accuracy varies. Always verify detected medicines. For educational purposes only.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
