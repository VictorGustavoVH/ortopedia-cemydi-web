"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, User } from "lucide-react";
import toast from "react-hot-toast";
import { isAuthenticated, decodeToken, getToken } from "@/lib/auth";
import { updateProfile } from "@/lib/api-requests";
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

  useEffect(() => {
    // Verificar autenticación al cargar la página
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Cargar datos iniciales desde el token
    loadInitialData();
  }, [router]);

  const loadInitialData = () => {
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
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      toast.error("Error al cargar los datos del perfil");
    } finally {
      setIsInitialLoading(false);
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
        </div>
      </div>
    </div>
  );
}

