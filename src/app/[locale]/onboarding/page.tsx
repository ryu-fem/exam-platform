"use client";

import { RegistrationWizard } from "@/components/auth/RegistrationWizard";

// The full registration flow now lives in /register. This route is kept as a
// visually identical entry point so existing links keep working; it resumes
// the wizard at the study-info step when a Telegram token is still in
// sessionStorage, otherwise it shows the Telegram step first.
export default function OnboardingPage() {
  return <RegistrationWizard resume />;
}