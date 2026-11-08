import { notFound } from "next/navigation";
import DevDiagnosticClient from "./DevDiagnosticClient";

export default function DevDiagnosticPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevDiagnosticClient />;
}
