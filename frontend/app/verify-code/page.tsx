"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { verifyResetCode } from "@/lib/api-requests";
import type { ApiError } from "@/lib/types";

function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Obtener email de los query params si existe
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Solo números
    if (value.length <= 6) {
      setCode(value);
      setError(null);
      setIsValid(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsValid(null);

    // Validaciones
    if (!email.trim()) {
      toast.error("El email es obligatorio");
      setIsLoading(false);
      return;
    }

    if (code.length !== 6) {
      toast.error("El código debe tener exactamente 6 dígitos");
      setIsLoading(false);
      return;
    }

    try {
      const response = await verifyResetCode({
        email: email.trim(),
        code: code.trim(),
      });

      if (response.valid) {
        toast.success("Código válido. Ahora puedes restablecer tu contraseña.");
        setIsValid(true);
        // Redirigir a reset-password con email y código
        setTimeout(() => {
          router.push(
            `/reset-password?email=${encodeURIComponent(
              email.trim()
            )}&code=${encodeURIComponent(code.trim())}`
          );
        }, 1500);
      } else {
        const errorMessage = response.message || "El código ingresado no es válido o ha expirado.";
        toast.error(errorMessage);
        setError(errorMessage);
        setIsValid(false);
      }
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "El código ingresado no es válido o ha expirado.";
      
      toast.error(errorMessage);
      setError(errorMessage);
      setIsValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-[#29A2A1]/10">
              <KeyRound className="w-8 h-8 text-[#29A2A1]" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-black">
            Verificar Código
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa el código de 6 dígitos que recibiste en tu correo
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-black mb-2"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
                setIsValid(null);
              }}
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
              placeholder="tu@email.com"
              disabled={isLoading || isValid === true}
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-black mb-2"
            >
              Código de verificación (6 dígitos)
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={handleCodeChange}
              maxLength={6}
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-lg shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1]/20 focus:border-[#29A2A1] transition-all duration-200 bg-white text-black text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              disabled={isLoading || isValid === true}
              autoComplete="one-time-code"
            />
            <p className="mt-1 text-xs text-gray-600">
              Ingresa el código de 6 dígitos
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isValid === true || code.length !== 6}
              className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <KeyRound className="w-4 h-4" />
              {isLoading
                ? "Verificando..."
                : isValid === true
                ? "Código válido ✓"
                : "Verificar Código"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
            >
              ← Solicitar nuevo código
            </Link>
            <p className="text-xs text-gray-600">
              ¿Recordaste tu contraseña?{" "}
              <Link
                href="/login"
                className="text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm">
          <div className="text-center">
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyCodeForm />
    </Suspense>
  );
}

