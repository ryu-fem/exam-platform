"use client";

import { RegistrationWizard } from "@/components/auth/RegistrationWizard";

// The full registration flow lives in /register. This route is kept as a
// visually identical entry point so existing links keep working.
export default function OnboardingPage() {
  return <RegistrationWizard />;
}