"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { loginUser } from "@/lib/api-requests";
import { saveToken, getUserRole } from "@/lib/auth";
import type { ApiError } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mostrar mensaje de éxito si viene en los query params
  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setSuccessMessage(decodeURIComponent(message));
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  }, [searchParams]);

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
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error("Todos los campos son obligatorios");
      setIsLoading(false);
      return;
    }

    // Validar formato de email
    if (!validateEmail(formData.email)) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      setIsLoading(false);
      return;
    }

    // Validar contraseña
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.message || "La contraseña no cumple con los requisitos.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Guardar el token (esto también guarda el rol automáticamente)
      saveToken(response.access_token);

      toast.success("Sesión iniciada con éxito.", {
        duration: 3000,
        position: "top-right",
      });
      
      // Redirigir según el rol del usuario (solo en caso de éxito)
      const userRole = response.user?.role || getUserRole();
      setTimeout(() => {
        if (userRole === "admin") {
          router.push("/users");
        } else {
          router.push("/");
        }
      }, 1000);
    } catch (err: any) {
      // NO redirigir ni recargar en caso de error
      const apiError: ApiError = err;
      
      // Manejar específicamente el error 401 (credenciales inválidas)
      let errorMessage = "Credenciales inválidas. Verifica tu email y contraseña.";
      
      if (apiError.statusCode === 401) {
        errorMessage = "Correo o contraseña incorrectos.";
      } else if (Array.isArray(apiError.message)) {
        errorMessage = apiError.message.join(", ");
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      // Mostrar toast con duración mínima de 3 segundos
      toast.error(errorMessage, {
        duration: 3000,
        position: "top-right",
      });
      
      setError(errorMessage);
      setIsLoading(false); // Asegurar que se detiene el loading
      
      // NO hacer router.push ni window.location.reload() aquí
      return; // Salir de la función para evitar cualquier redirección
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
              <LogIn className="w-8 h-8 text-[#29A2A1]" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold text-black">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tus credenciales para acceder
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="rounded-xl bg-[#33CC33]/10 border border-[#33CC33]/20 p-4">
              <p className="text-sm text-[#33CC33] font-medium">
                ✅ {successMessage}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-[#EE0000]/10 border border-[#EE0000]/20 p-4">
              <p className="text-sm text-[#EE0000] font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
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
                  placeholder="Ingresa tu contraseña"
                  disabled={isLoading}
                  autoComplete="current-password"
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
              <LogIn className="w-4 h-4" />
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              <Link
                href="/forgot-password"
                className="font-medium text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link
                href="/register"
                className="font-medium text-[#20636D] hover:text-[#20626C] transition-colors duration-200"
              >
                Regístrate aquí
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

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}

