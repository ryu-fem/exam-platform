"use client";

import { Suspense } from "react";

import { RegistrationWizard } from "@/components/auth/RegistrationWizard";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegistrationWizard />
    </Suspense>
  );
}