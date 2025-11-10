"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, LogIn, UserPlus, LogOut, Menu, X, UserCircle } from "lucide-react";
import { isAuthenticated, logout, getStoredUserRole, isAdmin } from "@/lib/auth";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detectar estado de autenticación y rol
  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(isAuthenticated());
      setUserRole(getStoredUserRole());
    };
    
    checkAuth();
    
    // Escuchar cambios en localStorage (cuando se hace login/logout en otra pestaña)
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Verificar también en intervalos para cambios en la misma pestaña
    const interval = setInterval(() => {
      checkAuth();
    }, 1000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo y marca */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-black hover:text-[#29A2A1] transition-colors duration-200"
              onClick={closeMobileMenu}
            >
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#29A2A1] text-white font-semibold text-lg sm:text-xl">
                C
              </div>
              <span className="font-semibold text-lg sm:text-xl hidden sm:inline">
                Ortopedia CEMYDI
              </span>
            </Link>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Inicio: siempre visible para todos */}
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive("/")
                  ? "bg-[#29A2A1] text-white"
                  : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
              }`}
              aria-current={isActive("/") ? "page" : undefined}
            >
              <Home className="w-4 h-4" />
              Inicio
            </Link>
            {/* Usuarios: solo para administradores */}
            {isLoggedIn && isAdmin() && (
              <Link
                href="/users"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive("/users")
                    ? "bg-[#29A2A1] text-white"
                    : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
                }`}
              >
                <Users className="w-4 h-4" />
                Usuarios
              </Link>
            )}
            {/* Mi Perfil: visible para usuarios autenticados (admin y client) */}
            {isLoggedIn && (
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive("/profile")
                    ? "bg-[#29A2A1] text-white"
                    : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
                }`}
              >
                <UserCircle className="w-4 h-4" />
                Mi Perfil
              </Link>
            )}
            {!isLoggedIn && (
              <>
                <Link
                  href="/login"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive("/login")
                      ? "bg-[#29A2A1] text-white"
                      : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] transition-all duration-200"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrarse
                </Link>
              </>
            )}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#EE0000] hover:bg-[#CC0000] transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            )}
          </nav>

          {/* Botón menú móvil */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:text-[#29A2A1] hover:bg-gray-100 transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-2">
            {/* Inicio: siempre visible para todos */}
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                isActive("/")
                  ? "bg-[#29A2A1] text-white"
                  : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
              }`}
              aria-current={isActive("/") ? "page" : undefined}
            >
              <Home className="w-5 h-5" />
              Inicio
            </Link>
            {/* Usuarios: solo para administradores */}
            {isLoggedIn && isAdmin() && (
              <Link
                href="/users"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                  isActive("/users")
                    ? "bg-[#29A2A1] text-white"
                    : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
                }`}
              >
                <Users className="w-5 h-5" />
                Usuarios
              </Link>
            )}
            {/* Mi Perfil: visible para usuarios autenticados (admin y client) */}
            {isLoggedIn && (
              <Link
                href="/profile"
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                  isActive("/profile")
                    ? "bg-[#29A2A1] text-white"
                    : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                Mi Perfil
              </Link>
            )}
            {!isLoggedIn && (
              <>
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                    isActive("/login")
                      ? "bg-[#29A2A1] text-white"
                      : "text-gray-700 hover:text-[#29A2A1] hover:bg-[#29A2A1]/10"
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] transition-all duration-200"
                >
                  <UserPlus className="w-5 h-5" />
                  Registrarse
                </Link>
              </>
            )}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white bg-[#EE0000] hover:bg-[#CC0000] transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

