"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { verifyEmail, resendVerificationEmail } from "@/lib/api-requests";
import type { ApiError } from "@/lib/types";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener token de los query params
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      // Intentar verificar automáticamente si hay token
      handleVerify(tokenParam);
    }
  }, [searchParams]);

  const handleVerify = async (tokenToVerify?: string) => {
    const tokenValue = tokenToVerify || token;
    if (!tokenValue) {
      setError("No se proporcionó un token de verificación");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setIsVerified(null);

    try {
      const response = await verifyEmail({ token: tokenValue });
      toast.success(response.message || "Correo electrónico verificado exitosamente");
      setIsVerified(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/login?message=" + encodeURIComponent("Tu correo ha sido verificado. Ya puedes iniciar sesión."));
      }, 2000);
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al verificar el correo electrónico";
      
      toast.error(errorMessage);
      setError(errorMessage);
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Por favor, ingresa tu correo electrónico");
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const response = await resendVerificationEmail({ email: email.trim() });
      toast.success(response.message || "Correo de verificación reenviado. Revisa tu bandeja de entrada.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al reenviar el correo de verificación";
      
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            {isVerified === true ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : isVerified === false ? (
              <XCircle className="h-8 w-8 text-red-600" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isVerified === true
              ? "Correo Verificado"
              : isVerified === false
              ? "Error de Verificación"
              : "Verificar Correo Electrónico"}
          </h2>
          <p className="text-gray-600">
            {isVerified === true
              ? "Tu correo electrónico ha sido verificado exitosamente."
              : isVerified === false
              ? "No se pudo verificar tu correo electrónico."
              : token
              ? "Verificando tu correo electrónico..."
              : "Ingresa el token de verificación o tu correo para reenviar el enlace."}
          </p>
        </div>

        {isVerified === null && (
          <div className="space-y-6">
            {!token && (
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Token de Verificación
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega el token de verificación aquí"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            {isVerifying ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-gray-600">Verificando...</span>
              </div>
            ) : (
              token && (
                <button
                  onClick={() => handleVerify()}
                  disabled={!token}
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verificar Correo
                </button>
              )
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-4 text-center">
                ¿No recibiste el correo? Ingresa tu email para reenviar el enlace de verificación.
              </p>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleResend}
                  disabled={!email.trim() || isResending}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Reenviar Correo de Verificación
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isVerified === true && (
          <div className="text-center">
            <p className="text-green-600 mb-4">
              Serás redirigido al inicio de sesión en breve...
            </p>
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Ir al inicio de sesión ahora
            </Link>
          </div>
        )}

        {isVerified === false && (
          <div className="text-center space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-2">
                El token puede haber expirado o ser inválido.
              </p>
              <p className="text-sm text-yellow-800">
                Usa el formulario de abajo para reenviar un nuevo correo de verificación.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email-retry"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Correo Electrónico
                </label>
                <input
                  id="email-retry"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={handleResend}
                disabled={!email.trim() || isResending}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Reenviar Correo de Verificación
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-primary transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 px-4 py-8">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-gray-600">Cargando...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

