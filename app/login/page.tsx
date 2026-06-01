import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-canvas px-4">
      <div className="w-full max-w-md panel p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-[12px] bg-leaf-600 grid place-items-center font-display text-[20px] font-extrabold text-white">
            A
          </div>
          <div className="leading-tight">
            <div className="font-display text-[20px] font-extrabold text-ink-600">AaspaasBazaar</div>
            <div className="text-[10.5px] font-semibold tracking-[0.15em] text-sage-500 uppercase">
              Admin Console
            </div>
          </div>
        </div>
        <h1 className="font-display text-[22px] font-bold text-ink-600">Sign in</h1>
        <p className="text-[13px] text-sage-600 mt-1">
          Sign in with your admin email and password.
        </p>
        <div className="mt-5">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
