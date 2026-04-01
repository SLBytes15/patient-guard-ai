/**
 * Condition-Drug Safety Service
 * Checks drug safety against patient health conditions (ABHA-based)
 */

export interface ConditionWarning {
  drug: string;
  condition: string;
  risk: "HIGH" | "MEDIUM";
  reason: string;
}

export interface ConditionSafetyResult {
  condition_warnings: ConditionWarning[];
  overall_condition_risk: "HIGH" | "MEDIUM" | "SAFE";
}

// Condition → Drug → Risk rules
const conditionDrugRules: Record<string, Record<string, { risk: "HIGH" | "MEDIUM"; reason: string }>> = {
  "kidney disease": {
    ibuprofen: { risk: "HIGH", reason: "May worsen kidney function and cause acute kidney injury." },
    diclofenac: { risk: "HIGH", reason: "NSAIDs are nephrotoxic and can accelerate renal decline." },
    naproxen: { risk: "HIGH", reason: "Can impair renal blood flow and cause fluid retention." },
    aspirin: { risk: "MEDIUM", reason: "High doses may affect kidney function." },
    metformin: { risk: "HIGH", reason: "Risk of lactic acidosis in patients with impaired renal function." },
    gentamicin: { risk: "HIGH", reason: "Aminoglycosides are nephrotoxic; dose adjustment required." },
    lisinopril: { risk: "MEDIUM", reason: "ACE inhibitors may worsen renal function; monitor closely." },
    losartan: { risk: "MEDIUM", reason: "ARBs require dose adjustment in renal impairment." },
  },
  hypertension: {
    pseudoephedrine: { risk: "HIGH", reason: "Can significantly raise blood pressure and cause hypertensive crisis." },
    ibuprofen: { risk: "MEDIUM", reason: "NSAIDs can reduce effectiveness of antihypertensives and raise BP." },
    diclofenac: { risk: "MEDIUM", reason: "May interfere with blood pressure control." },
    naproxen: { risk: "MEDIUM", reason: "Can counteract antihypertensive medications." },
    phenylephrine: { risk: "HIGH", reason: "Sympathomimetic that can dangerously elevate blood pressure." },
    dexamethasone: { risk: "MEDIUM", reason: "Corticosteroids can cause fluid retention and raise blood pressure." },
  },
  diabetes: {
    dexamethasone: { risk: "HIGH", reason: "Corticosteroids significantly increase blood glucose levels." },
    prednisolone: { risk: "HIGH", reason: "Steroids cause hyperglycemia and may require insulin adjustment." },
    thiazide: { risk: "MEDIUM", reason: "Thiazide diuretics can impair glucose tolerance." },
    atenolol: { risk: "MEDIUM", reason: "Beta-blockers may mask hypoglycemia symptoms." },
    propranolol: { risk: "MEDIUM", reason: "Can mask warning signs of low blood sugar." },
    phenytoin: { risk: "MEDIUM", reason: "May increase blood glucose levels." },
  },
  asthma: {
    propranolol: { risk: "HIGH", reason: "Non-selective beta-blockers can trigger severe bronchospasm." },
    atenolol: { risk: "MEDIUM", reason: "Beta-blockers may worsen airway resistance; use with caution." },
    aspirin: { risk: "HIGH", reason: "Can trigger aspirin-exacerbated respiratory disease (AERD)." },
    ibuprofen: { risk: "MEDIUM", reason: "NSAIDs may exacerbate asthma in sensitive patients." },
    morphine: { risk: "HIGH", reason: "Opioids can cause respiratory depression and histamine release." },
    codeine: { risk: "MEDIUM", reason: "May cause bronchospasm in some asthma patients." },
  },
};

/**
 * Check drugs against patient conditions and return warnings
 */
export function checkConditionSafety(
  drugs: string[],
  conditions: string[]
): ConditionSafetyResult {
  const warnings: ConditionWarning[] = [];

  for (const condition of conditions) {
    const conditionLower = condition.toLowerCase();
    const rules = conditionDrugRules[conditionLower];
    if (!rules) continue;

    for (const drug of drugs) {
      const drugLower = drug.toLowerCase().trim();
      const rule = rules[drugLower];
      if (rule) {
        warnings.push({
          drug: drug,
          condition: condition,
          risk: rule.risk,
          reason: rule.reason,
        });
      }
    }
  }

  const hasHigh = warnings.some((w) => w.risk === "HIGH");
  const hasMedium = warnings.some((w) => w.risk === "MEDIUM");

  return {
    condition_warnings: warnings.sort((a, b) =>
      a.risk === "HIGH" && b.risk !== "HIGH" ? -1 : a.risk !== "HIGH" && b.risk === "HIGH" ? 1 : 0
    ),
    overall_condition_risk: hasHigh ? "HIGH" : hasMedium ? "MEDIUM" : "SAFE",
  };
}
