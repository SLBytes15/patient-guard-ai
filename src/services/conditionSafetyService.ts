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

const conditionDrugRules: Record<string, Record<string, { risk: "HIGH" | "MEDIUM"; reason: string }>> = {
  "kidney disease": {
    ibuprofen: { risk: "HIGH", reason: "NSAIDs can worsen kidney function and cause acute kidney injury" },
    diclofenac: { risk: "HIGH", reason: "May reduce renal blood flow and damage kidneys" },
    metformin: { risk: "HIGH", reason: "Risk of lactic acidosis in impaired kidney function" },
    naproxen: { risk: "HIGH", reason: "Can impair renal blood flow and cause fluid retention" },
    aspirin: { risk: "MEDIUM", reason: "High doses may affect kidney function" },
    gentamicin: { risk: "HIGH", reason: "Aminoglycosides are nephrotoxic; dose adjustment required" },
    lisinopril: { risk: "MEDIUM", reason: "ACE inhibitors may worsen renal function; monitor closely" },
    losartan: { risk: "MEDIUM", reason: "ARBs require dose adjustment in renal impairment" },
  },
  hypertension: {
    pseudoephedrine: { risk: "HIGH", reason: "Can increase blood pressure and worsen hypertension" },
    ibuprofen: { risk: "MEDIUM", reason: "May reduce effectiveness of antihypertensive drugs" },
    diclofenac: { risk: "MEDIUM", reason: "May interfere with blood pressure control" },
    naproxen: { risk: "MEDIUM", reason: "Can counteract antihypertensive medications" },
    phenylephrine: { risk: "HIGH", reason: "Sympathomimetic that can dangerously elevate blood pressure" },
    dexamethasone: { risk: "MEDIUM", reason: "Corticosteroids can cause fluid retention and raise blood pressure" },
  },
  diabetes: {
    prednisolone: { risk: "HIGH", reason: "Can significantly raise blood sugar levels" },
    dexamethasone: { risk: "HIGH", reason: "Corticosteroids significantly increase blood glucose levels" },
    thiazide: { risk: "MEDIUM", reason: "Thiazide diuretics can impair glucose tolerance" },
    atenolol: { risk: "MEDIUM", reason: "Beta-blockers may mask hypoglycemia symptoms" },
    propranolol: { risk: "MEDIUM", reason: "Can mask warning signs of low blood sugar" },
    phenytoin: { risk: "MEDIUM", reason: "May increase blood glucose levels" },
  },
  asthma: {
    aspirin: { risk: "HIGH", reason: "May trigger asthma attacks in sensitive individuals" },
    propranolol: { risk: "HIGH", reason: "Non-selective beta-blockers can trigger severe bronchospasm" },
    atenolol: { risk: "MEDIUM", reason: "Beta-blockers may worsen airway resistance; use with caution" },
    ibuprofen: { risk: "MEDIUM", reason: "NSAIDs may exacerbate asthma in sensitive patients" },
    morphine: { risk: "HIGH", reason: "Opioids can cause respiratory depression and histamine release" },
    codeine: { risk: "MEDIUM", reason: "May cause bronchospasm in some asthma patients" },
  },
  "heart disease": {
    diclofenac: { risk: "HIGH", reason: "Increases risk of heart attack and stroke" },
    ibuprofen: { risk: "HIGH", reason: "NSAIDs increase cardiovascular risk in heart disease patients" },
    naproxen: { risk: "MEDIUM", reason: "May increase cardiovascular events; use lowest dose" },
    pseudoephedrine: { risk: "HIGH", reason: "Can cause dangerous cardiac stimulation" },
    dexamethasone: { risk: "MEDIUM", reason: "Can cause fluid retention and worsen heart failure" },
  },
  "thyroid disorder": {
    amiodarone: { risk: "MEDIUM", reason: "Can interfere with thyroid hormone levels" },
    lithium: { risk: "MEDIUM", reason: "Can cause hypothyroidism" },
    phenytoin: { risk: "MEDIUM", reason: "May alter thyroid hormone metabolism" },
  },
};

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
        warnings.push({ drug, condition, risk: rule.risk, reason: rule.reason });
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
