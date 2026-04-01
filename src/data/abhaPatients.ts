/**
 * Mock ABHA (Ayushman Bharat Health Account) patient dataset
 */

export interface ABHAPatient {
  abha_id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  conditions: string[];
}

export const abhaPatients: ABHAPatient[] = [
  {
    abha_id: "ABHA001",
    name: "Rahul Sharma",
    age: 52,
    gender: "Male",
    conditions: ["hypertension"],
  },
  {
    abha_id: "ABHA002",
    name: "Priya Patel",
    age: 45,
    gender: "Female",
    conditions: ["kidney disease"],
  },
  {
    abha_id: "ABHA003",
    name: "Amit Singh",
    age: 60,
    gender: "Male",
    conditions: ["diabetes", "hypertension"],
  },
  {
    abha_id: "ABHA004",
    name: "Neha Gupta",
    age: 34,
    gender: "Female",
    conditions: ["asthma"],
  },
  {
    abha_id: "ABHA005",
    name: "Vikram Reddy",
    age: 28,
    gender: "Male",
    conditions: [],
  },
  {
    abha_id: "ABHA006",
    name: "Sunita Devi",
    age: 65,
    gender: "Female",
    conditions: ["kidney disease", "diabetes"],
  },
  {
    abha_id: "ABHA007",
    name: "Rajesh Kumar",
    age: 48,
    gender: "Male",
    conditions: ["hypertension", "asthma"],
  },
];

export function getPatientByAbhaId(abhaId: string): ABHAPatient | undefined {
  return abhaPatients.find((p) => p.abha_id === abhaId);
}

export function getAllAbhaIds(): string[] {
  return abhaPatients.map((p) => p.abha_id);
}
