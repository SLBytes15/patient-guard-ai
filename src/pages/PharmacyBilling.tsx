import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Shield, AlertTriangle, CheckCircle2, Info,
  Pill, Loader2, User, Heart, ShoppingCart, Plus, Minus,
  Trash2, Receipt, Ban, ChevronDown, Zap,
} from "lucide-react";
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
  normalizeSelectedForInteractionCheck,
  searchDrugSuggestions,
  resolveSuggestionEntries,
  type DrugSuggestion,
} from "@/services/drugIntelligence";
import { abhaPatients, getPatientByAbhaId, type ABHAPatient } from "@/data/abhaPatients";
import { checkConditionSafety, type ConditionSafetyResult } from "@/services/conditionSafetyService";

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function PharmacyBilling() {
  const { toast } = useToast();

  // Patient state
  const [abhaInput, setAbhaInput] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatient | null>(null);
  const [showAbhaDropdown, setShowAbhaDropdown] = useState(false);

  // Drug search state
  const [drugInput, setDrugInput] = useState("");
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const drugInputRef = useRef<HTMLInputElement>(null);
  const drugDropdownRef = useRef<HTMLDivElement>(null);

  // Billing state
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [priceInput, setPriceInput] = useState("50");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [interactionResult, setInteractionResult] = useState<AnalysisResult | null>(null);
  const [conditionResult, setConditionResult] = useState<ConditionSafetyResult | null>(null);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [billFinalized, setBillFinalized] = useState(false);

  // Drug search debounce
  useEffect(() => {
    if (!drugInput || drugInput.length < 1) { setSuggestions([]); return; }
    const existingNames = billItems.map((b) => b.name);
    const timer = setTimeout(() => {
      setSuggestions(searchDrugSuggestions(drugInput, existingNames));
    }, 200);
    return () => clearTimeout(timer);
  }, [drugInput, billItems]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drugDropdownRef.current && !drugDropdownRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredAbhaPatients = abhaPatients.filter(
    (p) => p.abha_id.toLowerCase().includes(abhaInput.toLowerCase()) || p.name.toLowerCase().includes(abhaInput.toLowerCase())
  );

  const selectAbhaPatient = (abhaId: string) => {
    const patient = getPatientByAbhaId(abhaId);
    if (patient) {
      setSelectedPatient(patient);
      setAbhaInput(abhaId);
      setShowAbhaDropdown(false);
      resetSafety();
    }
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setAbhaInput("");
    resetSafety();
  };

  const resetSafety = () => {
    setInteractionResult(null);
    setConditionResult(null);
    setSafetyChecked(false);
    setBillFinalized(false);
  };

  // Quick test presets
  const quickTests = [
    { label: "Safe Combo", abha_id: "ABHA006", drugs: ["paracetamol", "vitamin c"], color: "bg-success/10 text-success border-success/30 hover:bg-success/20" },
    { label: "Condition Risk", abha_id: "ABHA001", drugs: ["ibuprofen", "paracetamol"], color: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20" },
    { label: "Drug Interaction", abha_id: "ABHA006", drugs: ["aspirin", "warfarin"], color: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20" },
  ];

  const loadQuickTest = (abhaId: string, drugs: string[]) => {
    // Set patient
    const patient = getPatientByAbhaId(abhaId);
    if (patient) {
      setSelectedPatient(patient);
      setAbhaInput(abhaId);
      setShowAbhaDropdown(false);
    }
    // Set drugs
    const newItems: BillItem[] = drugs.map((drug) => ({
      id: crypto.randomUUID(),
      name: drug,
      quantity: 1,
      price: 50,
    }));
    setBillItems(newItems);
    setDrugInput("");
    setSuggestions([]);
    setInteractionResult(null);
    setConditionResult(null);
    setSafetyChecked(false);
    setBillFinalized(false);
    toast({ title: "Quick test loaded", description: `${patient?.name ?? abhaId} + ${drugs.join(", ")}` });
  };

  const addDrug = (suggestionId: string) => {
    const entries = resolveSuggestionEntries(suggestionId);
    for (const entry of entries) {
      const exists = billItems.some((b) => b.name.toLowerCase() === entry.toLowerCase());
      if (!exists) {
        setBillItems((prev) => [...prev, {
          id: crypto.randomUUID(),
          name: entry,
          quantity: 1,
          price: parseFloat(priceInput) || 50,
        }]);
      }
    }
    setDrugInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    resetSafety();
    drugInputRef.current?.focus();
  };

  const addFromTypedInput = () => {
    if (!drugInput.trim()) return;
    const exists = billItems.some((b) => b.name.toLowerCase() === drugInput.toLowerCase());
    if (!exists) {
      setBillItems((prev) => [...prev, {
        id: crypto.randomUUID(),
        name: drugInput.trim(),
        quantity: 1,
        price: parseFloat(priceInput) || 50,
      }]);
    }
    setDrugInput("");
    resetSafety();
    drugInputRef.current?.focus();
  };

  const removeItem = (id: string) => {
    setBillItems((prev) => prev.filter((b) => b.id !== id));
    resetSafety();
  };

  const updateQuantity = (id: string, delta: number) => {
    setBillItems((prev) => prev.map((b) =>
      b.id === id ? { ...b, quantity: Math.max(1, b.quantity + delta) } : b
    ));
  };

  const updatePrice = (id: string, price: number) => {
    setBillItems((prev) => prev.map((b) => b.id === id ? { ...b, price } : b));
  };

  const totalAmount = billItems.reduce((sum, b) => sum + b.quantity * b.price, 0);

  // Safety analysis
  const analyzeSafety = async () => {
    if (billItems.length < 1) {
      toast({ title: "Add medicines", description: "Add at least one medicine to check safety.", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    const drugNames = billItems.map((b) => b.name);
    const normalized = normalizeSelectedForInteractionCheck(drugNames);

    try {
      // Drug-Drug interactions (need at least 2)
      let drugResult: AnalysisResult | null = null;
      if (normalized.length >= 2) {
        const meds: Medication[] = normalized.map((name) => ({ name }));
        try {
          drugResult = await checkInteractionsFromAPI(meds);
        } catch {
          drugResult = await checkInteractions(meds);
        }
      }
      setInteractionResult(drugResult);

      // Condition-Drug safety
      let condResult: ConditionSafetyResult | null = null;
      if (selectedPatient && selectedPatient.conditions.length > 0) {
        condResult = checkConditionSafety(normalized, selectedPatient.conditions);
      }
      setConditionResult(condResult);
      setSafetyChecked(true);
    } catch (error) {
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Could not run analysis.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  // Combined risk
  const combinedRisk = (() => {
    if (!safetyChecked) return null;
    const drugRisk = interactionResult?.interactions.some((i) => i.severity === "High") ? "HIGH"
      : interactionResult?.interactions.some((i) => i.severity === "Moderate") ? "MEDIUM" : "SAFE";
    const condRisk = conditionResult?.overall_condition_risk ?? "SAFE";
    if (drugRisk === "HIGH" || condRisk === "HIGH") return "HIGH";
    if (drugRisk === "MEDIUM" || condRisk === "MEDIUM") return "MEDIUM";
    return "SAFE";
  })();

  const canFinalize = combinedRisk !== "HIGH";

  const finalizeBill = () => {
    if (!canFinalize) return;
    setBillFinalized(true);
    toast({ title: "Bill Finalized! ✅", description: `Total: ₹${totalAmount.toFixed(2)} for ${billItems.length} item(s).` });
  };

  const handleDrugKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && suggestions.length > 0) { e.preventDefault(); addDrug(suggestions[0].id); }
    else if (e.key === "Enter" && drugInput.trim()) { e.preventDefault(); addFromTypedInput(); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero text-primary-foreground py-12">
        <div className="container text-center max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm mb-4">
              <ShoppingCart className="h-4 w-4" /><span>Pharmacy Billing System</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Smart Pharmacy Billing</h1>
            <p className="text-base text-white/70 max-w-xl mx-auto">
              Patient-aware billing with integrated drug interaction and condition safety checks via ABHA.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 container py-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-6">

          {/* LEFT: Patient + Medicines (3 cols) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Patient Selection */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-base font-semibold">Select Patient (ABHA ID)</h2>
              </div>

              {!selectedPatient ? (
                <div className="relative">
                  <Input placeholder="Search by ABHA ID or name..." value={abhaInput}
                    onChange={(e) => { setAbhaInput(e.target.value); setShowAbhaDropdown(true); }}
                    onFocus={() => setShowAbhaDropdown(true)} />
                  {showAbhaDropdown && abhaInput.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-elevated max-h-52 overflow-auto">
                      {filteredAbhaPatients.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No patients found</div>
                      ) : filteredAbhaPatients.map((p) => (
                        <button key={p.abha_id} onClick={() => selectAbhaPatient(p.abha_id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{p.abha_id}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{p.age}y, {p.gender}</span>
                          </div>
                          {p.conditions.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {p.conditions.map((c) => (
                                <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium capitalize">{c}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
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
                        <div className="font-semibold text-sm">{selectedPatient.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedPatient.abha_id} · {selectedPatient.age}y · {selectedPatient.gender}</div>
                      </div>
                    </div>
                    <button onClick={clearPatient} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                  {selectedPatient.conditions.length > 0 ? (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Heart className="h-3.5 w-3.5 text-warning" />
                      {selectedPatient.conditions.map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium capitalize">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs text-success font-medium">No known conditions</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Medicine Entry */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-base font-semibold">Add Medicines</h2>
              </div>

              <div className="flex gap-2" ref={drugDropdownRef}>
                <div className="relative flex-1">
                  <Input ref={drugInputRef} placeholder="Type medicine name..." value={drugInput}
                    onChange={(e) => { setDrugInput(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)} onKeyDown={handleDrugKeyDown} />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-elevated max-h-48 overflow-auto">
                      {suggestions.map((s) => (
                        <button key={s.id} onClick={() => addDrug(s.id)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{s.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{s.type}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input type="number" placeholder="₹" value={priceInput} onChange={(e) => setPriceInput(e.target.value)}
                  className="w-20" min="1" />
                <Button onClick={() => { if (suggestions.length > 0) addDrug(suggestions[0].id); else addFromTypedInput(); }}
                  disabled={!drugInput.trim()} className="gradient-primary border-0 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Billing Table */}
              {billItems.length > 0 && (
                <div className="mt-4 rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs text-muted-foreground">
                        <th className="text-left px-3 py-2 font-medium">Medicine</th>
                        <th className="text-center px-3 py-2 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 font-medium">Price (₹)</th>
                        <th className="text-right px-3 py-2 font-medium">Subtotal</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {billItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium capitalize">{item.name}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => updateQuantity(item.id, -1)}
                                className="p-0.5 rounded hover:bg-muted"><Minus className="h-3 w-3" /></button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)}
                                className="p-0.5 rounded hover:bg-muted"><Plus className="h-3 w-3" /></button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input type="number" value={item.price} min={1}
                              onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-16 h-7 text-xs text-right ml-auto" />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">₹{(item.quantity * item.price).toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => removeItem(item.id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-3 py-2" colSpan={3}>Total</td>
                        <td className="px-3 py-2 text-right">₹{totalAmount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Safety Check Button */}
              <div className="mt-4">
                <Button onClick={analyzeSafety} disabled={billItems.length < 1 || analyzing}
                  className="w-full gradient-primary border-0 gap-2 h-11">
                  {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking Safety...</>
                    : <><Shield className="h-4 w-4" /> Check Safety &amp; Generate Bill</>}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Results & Bill (2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            <AnimatePresence>
              {safetyChecked && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                  {/* Overall Risk Summary */}
                  <div className={`rounded-2xl border p-5 shadow-card ${
                    combinedRisk === "HIGH" ? "border-destructive/60 bg-destructive/10"
                      : combinedRisk === "MEDIUM" ? "border-warning/60 bg-warning/10"
                      : "border-success/60 bg-success/10"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${combinedRisk === "SAFE" ? "bg-success/15" : combinedRisk === "MEDIUM" ? "bg-warning/15" : "bg-destructive/15"}`}>
                        {combinedRisk === "SAFE" ? <Shield className="h-5 w-5 text-success" />
                          : combinedRisk === "HIGH" ? <Ban className="h-5 w-5 text-destructive" />
                          : <AlertTriangle className="h-5 w-5 text-warning" />}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm">Overall Risk</h3>
                        <p className={`text-sm font-bold ${
                          combinedRisk === "HIGH" ? "text-destructive" : combinedRisk === "MEDIUM" ? "text-warning" : "text-success"
                        }`}>
                          {combinedRisk === "HIGH" ? "🚨 HIGH — Unsafe for this patient"
                            : combinedRisk === "MEDIUM" ? "⚠️ MEDIUM — Proceed with caution"
                            : "✅ SAFE — No known risks"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Condition Warnings */}
                  {conditionResult && conditionResult.condition_warnings.length > 0 && (
                    <div className="rounded-2xl border border-warning/40 bg-card shadow-card overflow-hidden">
                      <div className="flex items-center gap-2 p-4 pb-3 bg-warning/5">
                        <Heart className="h-4 w-4 text-warning" />
                        <h3 className="font-display font-semibold text-sm">Patient Condition Warnings</h3>
                      </div>
                      <div className="divide-y divide-border">
                        {conditionResult.condition_warnings.map((w, i) => (
                          <div key={i} className="p-3 px-4">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className={`h-3.5 w-3.5 ${w.risk === "HIGH" ? "text-destructive" : "text-warning"}`} />
                                <span className="text-xs font-medium capitalize">{w.drug}</span>
                                <span className="text-[10px] text-muted-foreground">↔</span>
                                <span className="text-xs font-medium capitalize">{w.condition}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${w.risk === "HIGH" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                                {w.risk}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-5">{w.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drug Interaction Results */}
                  {interactionResult && interactionResult.interactions.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                      <div className="flex items-center gap-2 p-4 pb-3">
                        <Pill className="h-4 w-4 text-secondary" />
                        <h3 className="font-display font-semibold text-sm">Drug Interactions</h3>
                      </div>
                      <div className="divide-y divide-border">
                        {interactionResult.interactions.map((interaction, i) => (
                          <div key={i}>
                            <button className="w-full flex items-center justify-between p-3 px-4 text-left hover:bg-muted/50 transition-colors"
                              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className={`h-3.5 w-3.5 ${interaction.severity === "High" ? "text-destructive" : interaction.severity === "Moderate" ? "text-warning" : "text-success"}`} />
                                <span className="text-xs font-medium">{interaction.drugA} + {interaction.drugB}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <SeverityBadge severity={interaction.severity} />
                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} />
                              </div>
                            </button>
                            <AnimatePresence>
                              {expandedIdx === i && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="px-4 pb-3 border-t border-border pt-2 space-y-2">
                                    <div className="flex items-start gap-1.5">
                                      <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                      <p className="text-xs text-muted-foreground">{interaction.reason || interaction.message}</p>
                                    </div>
                                    {interaction.advice && (
                                      <div className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                                        <span className="font-semibold text-foreground">Guidance:</span> {interaction.advice}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No risks found */}
                  {(!interactionResult || interactionResult.interactions.length === 0) &&
                    (!conditionResult || conditionResult.condition_warnings.length === 0) && (
                    <div className="rounded-2xl border border-success/40 bg-success/5 p-5 text-center">
                      <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-1" />
                      <p className="text-sm font-medium text-success">All Clear — No risks detected</p>
                    </div>
                  )}

                  {/* Finalize Bill */}
                  <div className="rounded-2xl border border-border bg-card shadow-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt className="h-4 w-4 text-secondary" />
                      <h3 className="font-display font-semibold text-sm">Bill Summary</h3>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      {selectedPatient && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Patient</span><span className="font-medium text-foreground">{selectedPatient.name}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Items</span><span className="font-medium text-foreground">{billItems.length}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total Qty</span><span className="font-medium text-foreground">{billItems.reduce((s, b) => s + b.quantity, 0)}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between font-semibold">
                        <span>Grand Total</span><span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {combinedRisk === "HIGH" ? (
                      <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-center mb-3">
                        <Ban className="h-5 w-5 text-destructive mx-auto mb-1" />
                        <p className="text-xs font-semibold text-destructive">Unsafe to proceed — Resolve HIGH risk warnings first</p>
                      </div>
                    ) : combinedRisk === "MEDIUM" ? (
                      <div className="rounded-lg bg-warning/10 border border-warning/30 p-2.5 text-center mb-3">
                        <p className="text-xs text-warning font-medium">⚠️ Moderate risk — Review warnings before finalizing</p>
                      </div>
                    ) : null}

                    {billFinalized ? (
                      <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-center">
                        <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
                        <p className="text-sm font-semibold text-success">Bill Finalized ✅</p>
                        <p className="text-xs text-muted-foreground mt-1">Receipt #{Date.now().toString(36).toUpperCase()}</p>
                      </div>
                    ) : (
                      <Button onClick={finalizeBill} disabled={!canFinalize || billItems.length === 0}
                        className={`w-full gap-2 h-10 ${canFinalize ? "gradient-primary border-0" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                        <Receipt className="h-4 w-4" />
                        {canFinalize ? "Finalize Bill" : "Cannot Finalize — HIGH Risk"}
                      </Button>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      ⚠️ <strong>Disclaimer:</strong> For educational purposes only. Consult a healthcare professional.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Placeholder when no results */}
            {!safetyChecked && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Safety results will appear here</p>
                <p className="text-xs text-muted-foreground mt-1">Add medicines and click "Check Safety"</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
