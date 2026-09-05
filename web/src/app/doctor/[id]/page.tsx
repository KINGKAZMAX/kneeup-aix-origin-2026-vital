import DoctorPatientClient from "./client";
import { PATIENTS } from "@/lib/synth/patients";

export function generateStaticParams() {
  return PATIENTS.map((p) => ({ id: p.id }));
}

export default function DoctorPatientPage({ params }: { params: { id: string } }) {
  return <DoctorPatientClient id={params.id} />;
}
