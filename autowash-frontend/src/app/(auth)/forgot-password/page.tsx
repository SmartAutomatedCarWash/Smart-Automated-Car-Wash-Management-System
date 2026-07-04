import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { PublicAuthShell } from "@/features/auth/components/public-auth-shell";

export default function ForgotPasswordPage() {
  return (
    <PublicAuthShell
      title="Reset Password"
      description="Receive an OTP by email, verify your account, and set a new password."
      footer={
        <>
          Remember your password?
          <Link href="/login" className="font-bold text-teal-700 transition hover:text-teal-900 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </PublicAuthShell>
  );
}
