"use client";

import Link from "next/link";
import { Facebook, Instagram, Mail, Phone } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleContactClick = (type: "email" | "phone" | "facebook" | "instagram") => {
    switch (type) {
      case "email":
        window.location.href = "mailto:contacto@cemydi.com";
        break;
      case "phone":
        window.location.href = "tel:+521234567890";
        break;
      case "facebook":
        window.open("https://facebook.com/cemydi", "_blank");
        break;
      case "instagram":
        window.open("https://instagram.com/cemydi", "_blank");
        break;
    }
  };

  return (
    <footer className="bg-[#20636D] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Información de la empresa */}
          <div>
            <h3 className="font-semibold text-base mb-3">Ortopedia CEMYDI</h3>
            <p className="text-sm text-gray-200">
              Sistema de gestión para atención ortopédica profesional.
            </p>
          </div>

          {/* Enlaces útiles */}
          <div>
            <h3 className="font-semibold text-base mb-3">Enlaces Útiles</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => handleContactClick("email")}
                  className="text-gray-200 hover:text-white transition-colors duration-200"
                >
                  Aviso de Privacidad
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleContactClick("email")}
                  className="text-gray-200 hover:text-white transition-colors duration-200"
                >
                  Términos y Condiciones
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleContactClick("email")}
                  className="text-gray-200 hover:text-white transition-colors duration-200"
                >
                  Contacto
                </button>
              </li>
            </ul>
          </div>

          {/* Redes sociales y contacto */}
          <div>
            <h3 className="font-semibold text-base mb-3">Síguenos</h3>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => handleContactClick("facebook")}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleContactClick("instagram")}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleContactClick("email")}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleContactClick("phone")}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
                aria-label="Teléfono"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 sm:mt-8 pt-6 border-t border-white/20">
          <p className="text-sm text-center text-gray-200">
            © {currentYear} Ortopedia CEMYDI. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

