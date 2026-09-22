import { PatientShell } from "@/components/patient/PatientShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PatientShell>{children}</PatientShell>;
}
