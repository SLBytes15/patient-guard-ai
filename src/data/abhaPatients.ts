export interface ABHAPatient {
  abha_id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  conditions: string[];
}

export const abhaPatients: ABHAPatient[] = [
  { abha_id: "ABHA001", name: "Rahul Sharma", age: 52, gender: "Male", conditions: ["hypertension"] },
  { abha_id: "ABHA002", name: "Priya Verma", age: 45, gender: "Female", conditions: ["diabetes"] },
  { abha_id: "ABHA003", name: "Amit Patel", age: 60, gender: "Male", conditions: ["kidney disease"] },
  { abha_id: "ABHA004", name: "Sneha Iyer", age: 30, gender: "Female", conditions: ["asthma"] },
  { abha_id: "ABHA005", name: "Vikram Singh", age: 55, gender: "Male", conditions: ["hypertension", "diabetes"] },
  { abha_id: "ABHA006", name: "Neha Gupta", age: 28, gender: "Female", conditions: [] },
  { abha_id: "ABHA007", name: "Rohit Mehta", age: 65, gender: "Male", conditions: ["heart disease"] },
  { abha_id: "ABHA008", name: "Anjali Nair", age: 40, gender: "Female", conditions: ["thyroid disorder"] },
  { abha_id: "ABHA009", name: "Karan Malhotra", age: 35, gender: "Male", conditions: ["asthma", "hypertension"] },
  { abha_id: "ABHA010", name: "Pooja Reddy", age: 50, gender: "Female", conditions: ["kidney disease", "diabetes"] },
];

export function getPatientByAbhaId(abhaId: string): ABHAPatient | undefined {
  return abhaPatients.find((p) => p.abha_id === abhaId);
}

export function getAllAbhaIds(): string[] {
  return abhaPatients.map((p) => p.abha_id);
}
