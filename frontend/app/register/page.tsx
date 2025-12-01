"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { registerUser } from "@/lib/api-requests";
// No necesitamos saveToken ni getUserRole porque el registro no retorna token
import type { ApiError } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validación de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validaciones básicas
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("Todos los campos son obligatorios");
      setIsLoading(false);
      return;
    }

    if (formData.name.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres");
      setIsLoading(false);
      return;
    }

    // Validar formato de email
    if (!validateEmail(formData.email)) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      setIsLoading(false);
      return;
    }

    // Validar contraseña estricta
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.message || "La contraseña debe tener al menos 8 caracteres, números y símbolos.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      // Mostrar mensaje de éxito
      toast.success(response.message || "Cuenta creada correctamente. Por favor, verifica tu correo electrónico.");
      
      // Redirigir a la página de login con mensaje
      setTimeout(() => {
        router.push(`/login?message=${encodeURIComponent("Por favor, verifica tu correo electrónico para poder iniciar sesión.")}`);
      }, 2000);
    } catch (err: any) {
      // Manejar errores de la API
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al registrar. Intenta nuevamente.";
      
      // Detectar si es correo duplicado
      const errorLower = errorMessage.toLowerCase();
      if (
        errorLower.includes("ya existe") ||
        errorLower.includes("already exists") ||
        errorLower.includes("duplicado") ||
        errorLower.includes("email") && errorLower.includes("registrado")
      ) {
        toast.error("El correo ya está registrado.");
      } else {
        toast.error(errorMessage);
      }
      
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
              <UserPlus className="w-8 h-8 text-[#29A2A1]" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-black">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Regístrate para acceder al sistema
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-[#EE0000]/10 border border-[#EE0000]/20 p-4">
              <p className="text-sm text-[#EE0000] font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-black mb-2"
              >
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
                placeholder="Juan Pérez"
                disabled={isLoading}
              />
            </div>

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
                value={formData.email}
                onChange={handleChange}
                className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
                placeholder="juan@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-black mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full min-h-[40px] px-4 py-2 pr-12 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black"
                  placeholder="Mínimo 6 caracteres"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-md text-[#20636D] hover:text-[#29A2A1] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#29A2A1]/20 transition-all duration-200"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 stroke-[2]" />
                  ) : (
                    <Eye className="w-5 h-5 stroke-[2]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <UserPlus className="w-4 h-4" />
              {isLoading ? "Registrando..." : "Registrarse"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/login"
                className="font-medium text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
              >
                Inicia sesión
              </Link>
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
            >
              ← Volver al inicio
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

