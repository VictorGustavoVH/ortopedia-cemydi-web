"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { loginUser, verifyMfa } from "@/lib/api-requests";
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
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  // Mostrar mensaje si viene en los query params (éxito o error/información)
  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      const decodedMessage = decodeURIComponent(message);
      
      // Detectar si es un mensaje de sesión invalidada (mostrar como error)
      const isSessionInvalidated = decodedMessage.toLowerCase().includes("sesión invalidada") ||
                                  decodedMessage.toLowerCase().includes("cerró sesión en otro dispositivo");
      
      if (isSessionInvalidated) {
        setError(decodedMessage);
        // Mostrar toast de error
        toast.error(decodedMessage, {
          duration: 5000,
          position: "top-right",
        });
      } else {
        // Mensaje de éxito (como antes)
        setSuccessMessage(decodedMessage);
        // Limpiar el mensaje después de 5 segundos
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      }
    }
  }, [searchParams]);

  // Validación de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Validación básica de contraseña (solo verificar que no esté vacía)
  // NO validamos complejidad aquí porque el usuario ya tiene una contraseña establecida
  // Permitimos cualquier contraseña para que el backend pueda contar intentos fallidos y bloquear la cuenta
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password || password.trim().length === 0) {
      return {
        valid: false,
        message: "La contraseña es obligatoria.",
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

  const handleTotpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Solo números
    if (value.length <= 6) {
      setTotpCode(value);
      if (error) setError(null);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!totpCode || totpCode.length !== 6) {
      toast.error("El código TOTP debe tener 6 dígitos");
      setIsLoading(false);
      return;
    }

    if (!mfaToken) {
      toast.error("Token MFA no válido. Por favor, inicia sesión nuevamente.");
      setRequiresMfa(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await verifyMfa({
        mfaToken,
        totpCode,
      });

      // Guardar tokens y completar login
      saveToken(response.access_token, response.refresh_token);

      toast.success("Código verificado. Sesión iniciada con éxito.", {
        duration: 3000,
        position: "top-right",
      });

      // Redirigir según el rol
      const userRole = response.user?.role || getUserRole();
      setTimeout(() => {
        if (userRole === "admin") {
          router.push("/users");
        } else {
          router.push("/");
        }
      }, 1000);
    } catch (err: any) {
      const apiError: ApiError = err;
      let errorMessage = "Código TOTP inválido. Acceso denegado.";

      if (Array.isArray(apiError.message)) {
        errorMessage = apiError.message.join(", ");
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      toast.error(errorMessage, {
        duration: 4000,
        position: "top-right",
      });

      setError(errorMessage);
      setTotpCode(""); // Limpiar código para nuevo intento
    } finally {
      setIsLoading(false);
    }
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

    // Validar que la contraseña no esté vacía (permitimos cualquier contraseña para que el backend cuente intentos)
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.message || "La contraseña es obligatoria.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Si requiere MFA, mostrar formulario de código TOTP
      if (response.requiresMfa && response.mfaToken) {
        setRequiresMfa(true);
        setMfaToken(response.mfaToken);
        toast.success(response.message || "Ingresa el código de tu aplicación autenticadora", {
          duration: 5000,
          position: "top-right",
        });
        setIsLoading(false);
        return;
      }

      // Si no requiere MFA, continuar con el flujo normal
      if (!response.access_token || !response.refresh_token) {
        throw new Error("No se recibieron tokens de acceso");
      }

      // Guardar el token y refresh token (esto también guarda el rol automáticamente)
      saveToken(response.access_token, response.refresh_token);

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
      
      // Extraer el mensaje del backend (puede incluir información sobre bloqueo)
      let errorMessage = "Credenciales inválidas. Verifica tu email y contraseña.";
      
      // Priorizar el mensaje del backend que puede incluir detalles del bloqueo
      if (Array.isArray(apiError.message)) {
        errorMessage = apiError.message.join(", ");
      } else if (apiError.message) {
        errorMessage = apiError.message;
      } else if (apiError.statusCode === 401) {
        // Si es 401 pero no hay mensaje específico, usar mensaje genérico
        errorMessage = "Correo o contraseña incorrectos.";
      }
      
      // Detectar si es un mensaje de bloqueo para mostrar duración más larga
      const isBlockedMessage = errorMessage.toLowerCase().includes("bloqueada") || 
                               errorMessage.toLowerCase().includes("bloqueado") ||
                               errorMessage.toLowerCase().includes("intenta nuevamente");
      
      // Mostrar toast con duración más larga para mensajes de bloqueo
      const toastDuration = isBlockedMessage ? 6000 : 3000; // 6 segundos para bloqueos, 3 para otros
      
      toast.error(errorMessage, {
        duration: toastDuration,
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

        {requiresMfa ? (
          // Formulario de verificación MFA
          <form className="mt-8 space-y-6" onSubmit={handleVerifyMfa}>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-[#29A2A1]/10">
                  <Shield className="w-8 h-8 text-[#29A2A1]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">
                Verificación de Dos Factores
              </h3>
              <p className="text-sm text-gray-600">
                Ingresa el código de 6 dígitos de tu aplicación autenticadora
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-[#EE0000]/10 border border-[#EE0000]/20 p-4">
                <p className="text-sm text-[#EE0000] font-medium">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="totpCode"
                className="block text-sm font-medium text-black mb-2"
              >
                Código TOTP
              </label>
              <input
                id="totpCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={handleTotpChange}
                className="block w-full min-h-[40px] px-4 py-2 border border-[#9CA3AF] rounded-xl shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                disabled={isLoading}
                autoFocus
                autoComplete="off"
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                El código cambia cada 30 segundos
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Shield className="w-4 h-4" />
                {isLoading ? "Verificando..." : "Verificar Código"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequiresMfa(false);
                  setMfaToken(null);
                  setTotpCode("");
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full min-h-[40px] px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Volver
              </button>
            </div>
          </form>
        ) : (
          // Formulario de login normal
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
        )}
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

