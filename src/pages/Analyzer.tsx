import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Shield, AlertTriangle, CheckCircle2, Info, ChevronDown, Pill, Activity, Loader2, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useToast } from "@/hooks/use-toast";
import {
  checkInteractions,
  checkInteractionsFromAPI,
  type Medication,
  type AnalysisResult,
} from "@/services/interactionEngine";
import {
  appendUniqueEntries,
  formatSelectedSummary,
  normalizeSelectedForInteractionCheck,
  parsePrescriptionText as parseDrugText,
  searchDrugSuggestions,
  resolveSuggestionEntries,
  type DrugSuggestion,
} from "@/services/drugIntelligence";
import { abhaPatients, getPatientByAbhaId, type ABHAPatient } from "@/data/abhaPatients";
import { checkConditionSafety, type ConditionWarning, type ConditionSafetyResult } from "@/services/conditionSafetyService";

export default function Analyzer() {
  const { toast } = useToast();
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [conditionResult, setConditionResult] = useState<ConditionSafetyResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ABHA state
  const [abhaInput, setAbhaInput] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatient | null>(null);
  const [showAbhaDropdown, setShowAbhaDropdown] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!inputValue || inputValue.length < 1) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      const results = searchDrugSuggestions(inputValue, selectedDrugs);
      setSuggestions(results);
      setLoadingSuggestions(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue, selectedDrugs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addEntries = useCallback((entries: string[]) => {
    setSelectedDrugs((prev) => appendUniqueEntries(prev, entries));
    setInputValue("");
    setSuggestions([]);
    setResult(null);
    setConditionResult(null);
    inputRef.current?.focus();
  }, []);

  const removeDrug = (name: string) => {
    setSelectedDrugs((prev) => prev.filter((d) => d !== name));
    setResult(null);
    setConditionResult(null);
  };

  const addSuggestion = useCallback((suggestionId: string) => {
    addEntries(resolveSuggestionEntries(suggestionId));
  }, [addEntries]);

  const addFromTypedInput = useCallback(() => {
    const entries = parseDrugText(inputValue);
    if (entries.length === 0) return;
    addEntries(entries);
  }, [addEntries, inputValue]);

  const selectAbhaPatient = (abhaId: string) => {
    const patient = getPatientByAbhaId(abhaId);
    if (patient) {
      setSelectedPatient(patient);
      setAbhaInput(abhaId);
      setShowAbhaDropdown(false);
      setResult(null);
      setConditionResult(null);
    }
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setAbhaInput("");
    setResult(null);
    setConditionResult(null);
  };

  const filteredAbhaPatients = abhaPatients.filter(
    (p) => p.abha_id.toLowerCase().includes(abhaInput.toLowerCase()) || p.name.toLowerCase().includes(abhaInput.toLowerCase())
  );

  const analyze = async () => {
    if (selectedDrugs.length < 2) {
      toast({ title: "Add more drugs", description: "Need at least 2 medications for interaction analysis.", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    const normalized = normalizeSelectedForInteractionCheck(selectedDrugs);
    if (normalized.length < 2) {
      toast({ title: "Need more unique drugs", description: "Add at least 2 unique generic medicines.", variant: "destructive" });
      setAnalyzing(false);
      return;
    }
    const meds: Medication[] = normalized.map((name) => ({ name }));

    try {
      let res: AnalysisResult;
      try {
        res = await checkInteractionsFromAPI(meds);
      } catch {
        res = await checkInteractions(meds);
        toast({ title: "Running in local mode", description: "Backend is unreachable, using local interaction data." });
      }
      setResult(res);

      // Condition safety check
      if (selectedPatient && selectedPatient.conditions.length > 0) {
        const condResult = checkConditionSafety(normalized, selectedPatient.conditions);
        setConditionResult(condResult);
      } else {
        setConditionResult(null);
      }
    } catch (error) {
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Could not run analysis.", variant: "destructive" });
      setResult(null);
      setConditionResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && suggestions.length > 0) { e.preventDefault(); addSuggestion(suggestions[0].id); }
    else if (e.key === "Enter" && inputValue.trim()) { e.preventDefault(); addFromTypedInput(); }
    else if (e.key === "Backspace" && inputValue === "" && selectedDrugs.length > 0) { removeDrug(selectedDrugs[selectedDrugs.length - 1]); }
  };

  const overallSeverity = result
    ? result.interactions.length === 0 ? "safe"
      : result.interactions.some((i) => i.severity === "High") ? "danger"
      : result.interactions.some((i) => i.severity === "Moderate") ? "caution" : "safe"
    : null;

  const interactionSummary = result?.summary ?? {
    total: result?.interactions.length ?? 0,
    high: result?.interactions.filter((item) => item.severity === "High").length ?? 0,
    moderate: result?.interactions.filter((item) => item.severity === "Moderate").length ?? 0,
    low: result?.interactions.filter((item) => item.severity === "Low").length ?? 0,
  };

  // Combined overall risk
  const combinedOverallRisk = (() => {
    const drugRisk = overallSeverity === "danger" ? "HIGH" : overallSeverity === "caution" ? "MEDIUM" : "SAFE";
    const condRisk = conditionResult?.overall_condition_risk ?? "SAFE";
    if (drugRisk === "HIGH" || condRisk === "HIGH") return "HIGH";
    if (drugRisk === "MEDIUM" || condRisk === "MEDIUM") return "MEDIUM";
    return "SAFE";
  })();

  const riskLabel = combinedOverallRisk === "HIGH" ? "High Risk" : combinedOverallRisk === "MEDIUM" ? "Moderate Risk" : "No Known Risk";
  const overallCardTone = combinedOverallRisk === "HIGH" ? "border-destructive/60 bg-destructive/10"
    : combinedOverallRisk === "MEDIUM" ? "border-warning/60 bg-warning/10" : "border-success/60 bg-success/10";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero text-primary-foreground py-16">
        <div className="container text-center max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-6">
              <Shield className="h-4 w-4" /><span>Patient-Aware Drug Safety</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Detect unsafe drug interactions instantly</h1>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              Now with ABHA patient integration — check drugs against both interactions AND patient health conditions.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 container py-10">
        <div id="analysis-input" className="max-w-3xl mx-auto space-y-6">

          {/* ABHA Patient Selection */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-lg font-semibold">Patient (ABHA ID)</h2>
              <span className="text-xs text-muted-foreground ml-auto">Optional</span>
            </div>

            {!selectedPatient ? (
              <div className="relative">
                <Input
                  placeholder="Search by ABHA ID or patient name..."
                  value={abhaInput}
                  onChange={(e) => { setAbhaInput(e.target.value); setShowAbhaDropdown(true); }}
                  onFocus={() => setShowAbhaDropdown(true)}
                  className="pr-10"
                />
                {showAbhaDropdown && abhaInput.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-elevated max-h-60 overflow-auto">
                    {filteredAbhaPatients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No patients found</div>
                    ) : (
                      filteredAbhaPatients.map((p) => (
                        <button key={p.abha_id} onClick={() => selectAbhaPatient(p.abha_id)}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{p.abha_id}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{p.age}y, {p.gender}</span>
                          </div>
                          {p.conditions.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {p.conditions.map((c) => (
                                <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium capitalize">{c}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full gradient-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
                      {selectedPatient.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-semibold">{selectedPatient.name}</div>
                      <div className="text-xs text-muted-foreground">{selectedPatient.abha_id} · {selectedPatient.age} years · {selectedPatient.gender}</div>
                    </div>
                  </div>
                  <button onClick={clearPatient} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                {selectedPatient.conditions.length > 0 ? (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Heart className="h-4 w-4 text-warning" />
                    <span className="text-xs font-medium text-muted-foreground">Conditions:</span>
                    {selectedPatient.conditions.map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium capitalize">{c}</span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs text-success font-medium">No known health conditions</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Drug Input Section */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-card shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-lg font-semibold">Enter Medications</h2>
            </div>

            <div ref={dropdownRef} className="relative">
              <div className="flex flex-wrap gap-2 items-center min-h-[44px] px-3 py-2 rounded-xl border border-input bg-background cursor-text transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent"
                onClick={() => inputRef.current?.focus()}>
                <AnimatePresence>
                  {selectedDrugs.map((drug) => (
                    <motion.span key={drug} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-sm font-medium">
                      {drug}
                      <button onClick={(e) => { e.stopPropagation(); removeDrug(drug); }} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                <input ref={inputRef} type="text" placeholder={selectedDrugs.length === 0 ? "Type medicine name..." : "Add more..."}
                  value={inputValue} onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)} onKeyDown={handleKeyDown}
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground" />
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-elevated max-h-60 overflow-auto">
                  {suggestions.map((s) => (
                    <button key={s.id} onClick={() => { addSuggestion(s.id); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{s.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{s.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.subtitle}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button onClick={analyze} disabled={selectedDrugs.length < 2 || analyzing} className="gradient-primary border-0 gap-2">
                {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Search className="h-4 w-4" /> Analyze Safety</>}
              </Button>
              {selectedDrugs.length > 0 && (
                <p className="text-xs text-muted-foreground break-words flex-1">{formatSelectedSummary(selectedDrugs)}</p>
              )}
            </div>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                {/* Overall Assessment */}
                <div className={`rounded-2xl border p-6 shadow-card ${overallCardTone}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-xl ${combinedOverallRisk === "SAFE" ? "bg-success/15" : combinedOverallRisk === "MEDIUM" ? "bg-warning/15" : "bg-destructive/15"}`}>
                      {combinedOverallRisk === "SAFE" ? <Shield className="h-5 w-5 text-success" /> : <AlertTriangle className={`h-5 w-5 ${combinedOverallRisk === "HIGH" ? "text-destructive" : "text-warning"}`} />}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">Overall Assessment</h3>
                      <p className={`text-sm font-semibold ${combinedOverallRisk === "HIGH" ? "text-destructive" : combinedOverallRisk === "MEDIUM" ? "text-warning" : "text-success"}`}>
                        Combined Risk: {riskLabel}
                      </p>
                    </div>
                  </div>
                  {(interactionSummary.total > 0 || (conditionResult && conditionResult.condition_warnings.length > 0)) && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {interactionSummary.high > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-medium">Drug Interactions (High): {interactionSummary.high}</span>}
                      {interactionSummary.moderate > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">Drug Interactions (Moderate): {interactionSummary.moderate}</span>}
                      {conditionResult && conditionResult.condition_warnings.filter((w) => w.risk === "HIGH").length > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          Condition Warnings (High): {conditionResult.condition_warnings.filter((w) => w.risk === "HIGH").length}
                        </span>
                      )}
                      {conditionResult && conditionResult.condition_warnings.filter((w) => w.risk === "MEDIUM").length > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">
                          Condition Warnings (Medium): {conditionResult.condition_warnings.filter((w) => w.risk === "MEDIUM").length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Patient Condition Warnings (NEW) */}
                {conditionResult && conditionResult.condition_warnings.length > 0 && (
                  <div className="rounded-2xl border border-warning/40 bg-card shadow-card overflow-hidden">
                    <div className="flex items-center gap-2 p-6 pb-4 bg-warning/5">
                      <Heart className="h-5 w-5 text-warning" />
                      <h3 className="font-display font-semibold">Patient Condition Warnings</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{conditionResult.condition_warnings.length} warning(s)</span>
                    </div>
                    <div className="divide-y divide-border">
                      {conditionResult.condition_warnings.map((w, i) => (
                        <div key={i} className="p-4 px-6">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={`h-4 w-4 ${w.risk === "HIGH" ? "text-destructive" : "text-warning"}`} />
                              <span className="font-medium text-sm capitalize">{w.drug}</span>
                              <span className="text-xs text-muted-foreground">↔</span>
                              <span className="text-sm capitalize font-medium">{w.condition}</span>
                            </div>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${w.risk === "HIGH" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                              {w.risk}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">{w.reason}</p>
                          <p className={`text-xs mt-2 pl-6 font-medium ${w.risk === "HIGH" ? "text-destructive" : "text-warning"}`}>
                            🚨 {w.drug.charAt(0).toUpperCase() + w.drug.slice(1)} is {w.risk === "HIGH" ? "not recommended" : "to be used with caution"} for patients with {w.condition}.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications Card */}
                <div className="rounded-2xl border border-border bg-card shadow-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Pill className="h-5 w-5 text-secondary" />
                    <h3 className="font-display font-semibold">Medications Checked</h3>
                    <span className="ml-auto text-xs text-muted-foreground">{result.medicationCount} drugs</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrugs.map((drug) => (
                      <span key={drug} className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium">{drug}</span>
                    ))}
                  </div>
                </div>

                {/* Drug Interaction Results */}
                {result.interactions.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                    <div className="flex items-center gap-2 p-6 pb-4">
                      <Activity className="h-5 w-5 text-secondary" />
                      <h3 className="font-display font-semibold">Drug Interaction Details</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {result.interactions.map((interaction, i) => (
                        <div key={i}>
                          <button className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                            <div className="flex items-center gap-3">
                              <AlertTriangle className={`h-4 w-4 ${interaction.severity === "High" ? "text-destructive" : interaction.severity === "Moderate" ? "text-warning" : "text-success"}`} />
                              <span className="font-medium text-sm">{interaction.drugA} + {interaction.drugB}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={interaction.severity} />
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedIdx === i && (
                              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="px-6 pb-4 border-t border-border pt-3 space-y-3">
                                  <div className="flex items-start gap-2">
                                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-sm text-muted-foreground leading-relaxed">{interaction.reason || interaction.message}</p>
                                  </div>
                                  {interaction.advice && (
                                    <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                                      <span className="font-semibold text-foreground">Guidance:</span> {interaction.advice}
                                    </div>
                                  )}
                                  {interaction.source && <p className="text-[11px] text-muted-foreground">Source: {interaction.source}</p>}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.interactions.length === 0 && (!conditionResult || conditionResult.condition_warnings.length === 0) && (
                  <div className="rounded-2xl border border-success/40 bg-success/5 p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <h3 className="font-display font-semibold">All Clear</h3>
                    <p className="text-sm text-muted-foreground">No known drug interactions or condition-based risks found.</p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    ⚠️ <strong>Disclaimer:</strong> For educational purposes only. This tool does not replace professional medical advice. Always consult a healthcare professional before making medication decisions.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
