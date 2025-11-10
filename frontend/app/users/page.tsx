"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Edit, UserCog, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { getUsers, updateUser, updateUserRole, deleteUser } from "@/lib/api-requests";
import { isAuthenticated, logout, isAdmin } from "@/lib/auth";
import type { User, ApiError } from "@/lib/types";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    // Verificar autenticación al cargar la página
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    // Verificar que el usuario sea administrador
    if (!isAdmin()) {
      toast.error("Acceso denegado. Solo los administradores pueden acceder a esta sección.");
      router.push("/");
      return;
    }

    // Cargar usuarios solo si es admin
    loadUsers();
  }, [router]);

  // Handlers para las acciones
  const handleEditClick = (user: User) => {
    setEditingUser(user.id);
    setEditForm({ name: user.name, email: user.email });
  };

  const handleEditCancel = () => {
    setEditingUser(null);
    setEditForm({ name: "", email: "" });
  };

  const handleEditSave = async (userId: string) => {
    // Validaciones
    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.email.trim() || !emailRegex.test(editForm.email.trim())) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      return;
    }

    try {
      const result = await updateUser(userId, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
      });
      
      // Actualizar el usuario en la lista
      setUsers(users.map(u => u.id === userId ? result.user : u));
      setEditingUser(null);
      setEditForm({ name: "", email: "" });
      toast.success("Usuario actualizado correctamente.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al actualizar el usuario.";
      toast.error(errorMessage);
    }
  };

  const handleRoleChange = async (user: User) => {
    const newRole = user.role === "admin" ? "client" : "admin";
    const confirmMessage = `¿Cambiar el rol de ${user.name} a "${newRole}"?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsUpdatingRole(user.id);
      const result = await updateUserRole(user.id, newRole);
      
      // Actualizar el usuario en la lista
      setUsers(users.map(u => u.id === user.id ? result.user : u));
      toast.success(`Rol actualizado a "${newRole}" correctamente.`);
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al cambiar el rol del usuario.";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleDeleteClick = async (user: User) => {
    const confirmMessage = `¿Seguro que deseas eliminar a ${user.name} (${user.email})? Esta acción no se puede deshacer.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsDeleting(user.id);
      await deleteUser(user.id);
      
      // Remover el usuario de la lista
      setUsers(users.filter(u => u.id !== user.id));
      toast.success("Usuario eliminado correctamente.");
    } catch (err: any) {
      const apiError: ApiError = err;
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(", ")
        : apiError.message || "Error al eliminar usuario.";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(null);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (err: any) {
      const apiError: ApiError = err;
      if (apiError.statusCode === 401) {
        // Token inválido o expirado
        logout();
      } else {
        if (Array.isArray(apiError.message)) {
          setError(apiError.message.join(", "));
        } else {
          setError(
            apiError.message ||
              "Error al cargar los usuarios. Intenta nuevamente."
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Si no está autenticado o no es admin, no renderizar nada (será redirigido)
  if (!isAuthenticated() || !isAdmin()) {
    return null;
  }

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#29A2A1]/10">
              <Users className="w-6 h-6 text-[#29A2A1]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-black">
                Gestión de Usuarios
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Administra y gestiona los usuarios del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#29A2A1]"></div>
                <p className="mt-4 text-sm text-gray-600">
                  Cargando usuarios...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-[#EE0000]/10 border border-[#EE0000]/20 p-4">
              <p className="text-sm text-[#EE0000] font-medium">{error}</p>
              <button
                onClick={loadUsers}
                className="mt-4 flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#29A2A1] rounded-xl hover:bg-[#20626C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 transition-all duration-200"
              >
                Reintentar
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No hay usuarios registrados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${
                        editingUser === user.id ? "bg-[#29A2A1]/5" : ""
                      }`}
                    >
                      {editingUser === user.id ? (
                        // Modo edición inline
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              className="block w-full min-h-[40px] px-3 py-2 border border-[#9CA3AF] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black text-sm"
                              placeholder="Nombre"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) =>
                                setEditForm({ ...editForm, email: e.target.value })
                              }
                              className="block w-full min-h-[40px] px-3 py-2 border border-[#9CA3AF] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#29A2A1] focus:border-[#20626C] transition-all duration-200 bg-white text-black text-sm"
                              placeholder="Email"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#29A2A1]/10 text-[#29A2A1]">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditSave(user.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#33CC33] rounded-lg hover:bg-[#2BB02B] transition-colors duration-200"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // Modo visualización normal
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#29A2A1]/10 text-[#29A2A1]">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botón Editar */}
                              <button
                                onClick={() => handleEditClick(user)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#29A2A1] bg-[#29A2A1]/10 rounded-lg hover:bg-[#29A2A1]/20 transition-colors duration-200"
                                title="Editar usuario"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Editar
                              </button>

                              {/* Botón Cambiar Rol */}
                              <button
                                onClick={() => handleRoleChange(user)}
                                disabled={isUpdatingRole === user.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#20636D] bg-[#20636D]/10 rounded-lg hover:bg-[#20636D]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                title="Cambiar rol"
                              >
                                <UserCog className="w-3.5 h-3.5" />
                                {isUpdatingRole === user.id
                                  ? "Cambiando..."
                                  : user.role === "admin"
                                  ? "A Cliente"
                                  : "A Admin"}
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={() => handleDeleteClick(user)}
                                disabled={isDeleting === user.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#EE0000] bg-[#EE0000]/10 rounded-lg hover:bg-[#EE0000]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {isDeleting === user.id ? "Eliminando..." : "Eliminar"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Información adicional */}
          {!isLoading && !error && users.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Total de usuarios: <span className="font-semibold text-[#29A2A1]">{users.length}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

