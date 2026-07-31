import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { PublicAuthShell } from "@/features/auth/components/public-auth-shell";

type ForgotPasswordPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const fromCustomerProfile = searchParams?.from === "customer-profile";
  const completionHref = fromCustomerProfile ? "/customer/profile" : "/login";
  const completionLabel = fromCustomerProfile ? "Back to profile" : "Sign in";

  return (
    <PublicAuthShell
      title="Reset Password"
      description="Receive an OTP by email, verify your account, and set a new password."
      footer={
        <>
          {fromCustomerProfile ? "Return without changing your password?" : "Remember your password?"}
          <Link href={completionHref} className="font-bold text-teal-700 transition hover:text-teal-900 hover:underline">
            {fromCustomerProfile ? "Back to profile" : "Back to sign in"}
          </Link>
        </>
      }
    >
      <ForgotPasswordForm
        completionHref={completionHref}
        completionLabel={completionLabel}
        completionMessage={
          fromCustomerProfile
            ? "Your password has been changed. You can return to your profile now."
            : undefined
        }
      />
    </PublicAuthShell>
  );
}
