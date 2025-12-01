"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, User, Shield, ShieldCheck, ShieldOff, QrCode, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { isAuthenticated, decodeToken, getToken } from "@/lib/auth";
import { updateProfile, generateMfaSecret, enableMfa, disableMfa, getMfaStatus } from "@/lib/api-requests";
import type { ApiError } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [originalData, setOriginalData] = useState({
    name: "",
    email: "",
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  useEffect(() => {
    // Verificar autenticación al cargar la página
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Cargar datos iniciales desde el token
    loadInitialData();
  }, [router]);

  const loadInitialData = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const decoded = decodeToken(token);
      if (decoded) {
        // Inicializar con email del token (el nombre no está en el token, se podría cargar de otra forma)
        setFormData({
          name: "", // TODO: Esto se podría obtener de otro endpoint o guardar en el token
          email: decoded.email || "",
          password: "",
        });
        setOriginalData({
          name: "",
          email: decoded.email || "",
        });
      }

      // Cargar estado de MFA desde el backend
      try {
        const mfaStatus = await getMfaStatus();
        setMfaEnabled(mfaStatus.mfaEnabled);
      } catch (error) {
        // Si falla, mantener el estado como null (no mostrará el botón hasta que se cargue)
        console.error("Error al cargar estado de MFA:", error);
      }
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      toast.error("Error al cargar los datos del perfil");
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleGenerateMfaSecret = async () => {
    setIsMfaLoading(true);
    try {
      const response = await generateMfaSecret();
      setMfaSecret(response.secret);
      setQrCodeUrl(response.qrCodeUrl);
      setShowMfaSetup(true);
      toast.success("Código QR generado. Escanéalo con tu aplicación autenticadora.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al generar el código QR";
      toast.error(errorMessage);
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      toast.error("El código TOTP debe tener 6 dígitos");
      return;
    }
    if (!mfaSecret) {
      toast.error("Primero debes generar el código QR");
      return;
    }

    setIsMfaLoading(true);
    try {
      await enableMfa({
        secret: mfaSecret,
        totpCode,
      });
      setMfaEnabled(true);
      setShowMfaSetup(false);
      setMfaSecret(null);
      setQrCodeUrl(null);
      setTotpCode("");
      toast.success("Autenticación multifactor (MFA) activada exitosamente.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al activar MFA";
      toast.error(errorMessage);
      setTotpCode("");
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm("¿Estás seguro de que deseas desactivar la autenticación multifactor? Tu cuenta será menos segura.")) {
      return;
    }

    setIsMfaLoading(true);
    try {
      await disableMfa();
      setMfaEnabled(false);
      toast.success("Autenticación multifactor (MFA) desactivada exitosamente.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al desactivar MFA";
      toast.error(errorMessage);
    } finally {
      setIsMfaLoading(false);
    }
  };

  // Validación de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Validación de contraseña
  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password) {
      return { valid: true }; // La contraseña es opcional
    }

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
    if (!/\d/.test(password)) {
      return {
        valid: false,
        message: "La contraseña debe contener al menos un número.",
      };
    }
    if (!/[@$!%*?&#]/.test(password)) {
      return {
        valid: false,
        message: "La contraseña debe contener al menos un símbolo (@$!%*?&#).",
      };
    }
    return { valid: true };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpiar errores anteriores
    setErrors({});

    // Validaciones
    const newErrors: typeof errors = {};

    // Validar nombre
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres.";
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio.";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Por favor ingresa un correo electrónico válido.";
    }

    // Validar contraseña (si se proporciona)
    if (formData.password) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.message;
      }
    }

    // Si hay errores, mostrarlos y no continuar
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mostrar toast con el primer error encontrado
      const firstError = Object.values(newErrors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    // Preparar datos para enviar (solo los que cambiaron o los obligatorios)
    const dataToSend: { name?: string; email?: string; password?: string } = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };

    // Solo agregar password si se proporcionó
    if (formData.password.trim()) {
      dataToSend.password = formData.password;
    }

    // Enviar al backend
    try {
      setIsLoading(true);
      const result = await updateProfile(dataToSend);

      // Actualizar datos originales
      setOriginalData({
        name: result.user.name,
        email: result.user.email,
      });

      // Limpiar campo de contraseña
      setFormData((prev) => ({
        ...prev,
        password: "",
      }));

      toast.success("Perfil actualizado correctamente.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "No se pudo actualizar el perfil.";

      toast.error(errorMessage);

      // Si el error es de email duplicado, marcarlo en el campo
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("correo")) {
        setErrors((prev) => ({
          ...prev,
          email: errorMessage,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Si no está autenticado o está cargando datos iniciales, no renderizar nada
  if (!isAuthenticated() || isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#29A2A1]"></div>
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-[#29A2A1]/10">
                <User className="w-5 h-5 text-[#29A2A1]" />
              </div>
              <h1 className="text-2xl font-semibold text-black">
                Editar mi perfil
              </h1>
            </div>
            <p className="text-sm text-gray-600">
              Actualiza tu información personal
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nombre */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`block w-full min-h-[40px] px-3 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-black text-sm ${
                  errors.name
                    ? "border-[#EE0000] focus:ring-[#EE0000] focus:border-[#EE0000]"
                    : "border-[#9CA3AF] focus:ring-[#29A2A1] focus:border-[#20626C]"
                }`}
                placeholder="Ingresa tu nombre"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-[#EE0000]">{errors.name}</p>
              )}
            </div>

            {/* Campo Correo */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`block w-full min-h-[40px] px-3 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-black text-sm ${
                  errors.email
                    ? "border-[#EE0000] focus:ring-[#EE0000] focus:border-[#EE0000]"
                    : "border-[#9CA3AF] focus:ring-[#29A2A1] focus:border-[#20626C]"
                }`}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#EE0000]">{errors.email}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña nueva (opcional)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`block w-full min-h-[40px] px-3 py-2 border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 bg-white text-black text-sm ${
                  errors.password
                    ? "border-[#EE0000] focus:ring-[#EE0000] focus:border-[#EE0000]"
                    : "border-[#9CA3AF] focus:ring-[#29A2A1] focus:border-[#20626C]"
                }`}
                placeholder="Deja en blanco si no quieres cambiarla"
              />
              {errors.password ? (
                <p className="mt-1 text-xs text-[#EE0000]">{errors.password}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 símbolo
                </p>
              )}
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#29A2A1] rounded-xl hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              {isLoading ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>

          {/* Sección MFA */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[#29A2A1]/10">
                <Shield className="w-5 h-5 text-[#29A2A1]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-black">
                  Autenticación Multifactor (MFA)
                </h2>
                <p className="text-sm text-gray-600">
                  Protege tu cuenta con un segundo factor de autenticación
                </p>
              </div>
            </div>

            {mfaEnabled === false && !showMfaSetup && (
              <div className="text-center py-4">
                <button
                  onClick={handleGenerateMfaSecret}
                  disabled={isMfaLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#29A2A1] bg-[#29A2A1]/10 rounded-xl hover:bg-[#29A2A1]/20 focus:outline-none focus:ring-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isMfaLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      Activar MFA
                    </>
                  )}
                </button>
              </div>
            )}

            {mfaEnabled === null && !showMfaSetup && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#29A2A1]"></div>
                <p className="mt-2 text-sm text-gray-600">Cargando estado de MFA...</p>
              </div>
            )}

            {showMfaSetup && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>Paso 1:</strong> Escanea este código QR con tu aplicación autenticadora (Google Authenticator, Authy, etc.)
                  </p>
                  {qrCodeUrl && (
                    <div className="flex justify-center mb-3">
                      <img src={qrCodeUrl} alt="QR Code MFA" className="w-48 h-48 border-2 border-gray-300 rounded-lg" />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 text-center">
                    O ingresa manualmente este código: <code className="bg-white px-2 py-1 rounded">{mfaSecret}</code>
                  </p>
                </div>

                <form onSubmit={handleEnableMfa} className="space-y-3">
                  <div>
                    <label
                      htmlFor="totpCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Código TOTP (6 dígitos)
                    </label>
                    <input
                      id="totpCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 6) {
                          setTotpCode(value);
                        }
                      }}
                      className="block w-full min-h-[40px] px-3 py-2 border border-[#9CA3AF] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black text-center text-xl tracking-widest font-mono"
                      placeholder="000000"
                      disabled={isMfaLoading}
                      autoFocus
                    />
                    <p className="mt-1 text-xs text-gray-500 text-center">
                      Ingresa el código de 6 dígitos de tu aplicación autenticadora
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isMfaLoading || totpCode.length !== 6}
                      className="flex-1 flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#29A2A1] rounded-xl hover:bg-[#20626C] focus:outline-none focus:ring-2 focus:ring-[#29A2A1]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {isMfaLoading ? "Activando..." : "Activar MFA"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMfaSetup(false);
                        setMfaSecret(null);
                        setQrCodeUrl(null);
                        setTotpCode("");
                      }}
                      disabled={isMfaLoading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {mfaEnabled && !showMfaSetup && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-sm font-medium">MFA está activado</span>
                </div>
                <p className="text-sm text-gray-600">
                  Tu cuenta está protegida con autenticación multifactor. Deberás ingresar un código TOTP cada vez que inicies sesión.
                </p>
                <button
                  onClick={handleDisableMfa}
                  disabled={isMfaLoading}
                  className="w-full flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ShieldOff className="w-4 h-4" />
                  {isMfaLoading ? "Desactivando..." : "Desactivar MFA"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

