"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";
import { resetPassword } from "@/lib/api-requests";
import type { ApiError } from "@/lib/types";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validación de contraseña estricta
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return {
        valid: false,
        message: "La contraseña debe tener al menos 8 caracteres.",
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "La contraseña debe contener al menos una letra mayúscula.",
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "La contraseña debe contener al menos una letra minúscula.",
      };
    }
    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: "La contraseña debe contener al menos un número.",
      };
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return {
        valid: false,
        message: "La contraseña debe contener al menos un símbolo especial (!@#$%^&*).",
      };
    }
    return { valid: true };
  };

  // Obtener email y código de los query params si existen
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const codeParam = searchParams.get("code");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (codeParam) {
      setCode(decodeURIComponent(codeParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setSuccess(false);

    // Validaciones
    if (!email.trim()) {
      toast.error("El email es obligatorio");
      setIsLoading(false);
      return;
    }

    if (!code.trim() || code.length !== 6) {
      toast.error("El código debe tener exactamente 6 dígitos");
      setIsLoading(false);
      return;
    }

    // Validar contraseña estricta
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.message || "La contraseña debe tener al menos 8 caracteres, números y símbolos.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    try {
      const response = await resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword: newPassword,
      });

      toast.success("Contraseña actualizada.");
      setSuccess(true);
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/login?message=Contraseña actualizada correctamente");
      }, 2000);
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "No se pudo actualizar la contraseña. Intenta de nuevo.";
      
      toast.error(errorMessage);
      setError(errorMessage);
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
              <Lock className="w-8 h-8 text-[#29A2A1]" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-black">
            Restablecer Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tu nueva contraseña
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
              }}
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
              placeholder="tu@email.com"
              disabled={isLoading || success || !!searchParams.get("email")}
            />
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-black mb-2"
            >
              Código de verificación
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 6) {
                  setCode(value);
                  setError(null);
                }
              }}
              maxLength={6}
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-lg shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1]/20 focus:border-[#29A2A1] transition-all duration-200 bg-white text-black font-mono text-center"
              placeholder="000000"
              disabled={isLoading || success || !!searchParams.get("code")}
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-black mb-2"
            >
              Nueva Contraseña
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError(null);
              }}
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
              placeholder="Mínimo 8 caracteres"
              disabled={isLoading || success}
            />
            <p className="mt-1 text-xs text-gray-600">
              Mínimo 8 caracteres
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-black mb-2"
            >
              Confirmar Contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
              placeholder="Confirma tu contraseña"
              disabled={isLoading || success}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Lock className="w-4 h-4" />
              {isLoading
                ? "Restableciendo..."
                : success
                ? "Contraseña actualizada ✓"
                : "Restablecer Contraseña"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link
              href="/login"
              className="text-sm font-medium text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}

