"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import { requestPasswordReset } from "@/lib/api-requests";
import type { ApiError } from "@/lib/types";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setSuccess(false);

    // Validación básica
    if (!email.trim()) {
      setError("El email es obligatorio");
      setIsLoading(false);
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Por favor ingresa un email válido");
      setIsLoading(false);
      return;
    }

    try {
      const response = await requestPasswordReset({ email: email.trim() });
      // Usar el mensaje del backend que es genérico y no revela si el usuario existe
      const successMessage = response.message || "Si el correo existe en nuestro sistema, recibirás un enlace de recuperación por email.";
      toast.success(successMessage);
      setSuccess(true);
      // El usuario recibirá un enlace por email, no necesita redirigir
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al procesar la solicitud. Por favor, intenta nuevamente.";
      
      // Mostrar mensaje de error genérico (nunca revelar si el usuario existe o no)
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
              <Mail className="w-8 h-8 text-[#29A2A1]" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-black">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tu correo electrónico para recibir un enlace de recuperación
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
              className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-lg shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1]/20 focus:border-[#29A2A1] transition-all duration-200 bg-white text-black"
              placeholder="tu@email.com"
              disabled={isLoading || success}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Mail className="w-4 h-4" />
              {isLoading ? "Enviando..." : success ? "Enlace enviado ✓" : "Enviar Enlace"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link
              href="/login"
              className="text-sm font-medium text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
            >
              ← Volver al inicio de sesión
            </Link>
            <p className="text-xs text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link
                href="/register"
                className="text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
              >
                Regístrate
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

