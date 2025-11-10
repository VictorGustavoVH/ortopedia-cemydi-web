"use client";

import Link from "next/link";
import { Stethoscope, Package, CircleUser, ArrowRight, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero Principal */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black mb-4 font-[var(--font-montserrat)]">
              Tu bienestar es nuestra prioridad
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 font-[var(--font-inter)]">
              Venta y renta de artículos ortopédicos con atención personalizada.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-base font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Explorar catálogo
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="p-8 rounded-2xl bg-[#29A2A1]/10 border border-[#29A2A1]/20">
              <Stethoscope className="w-32 h-32 text-[#29A2A1]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-black text-center mb-8 font-[var(--font-montserrat)]">
            ¿Por qué elegirnos?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#29A2A1]/10">
                  <Package className="w-6 h-6 text-[#29A2A1]" />
                </div>
                <h3 className="text-xl font-semibold text-black font-[var(--font-montserrat)]">
                  Productos de calidad
                </h3>
              </div>
              <p className="text-gray-600 font-[var(--font-inter)]">
                Ofrecemos equipos ortopédicos certificados y de las mejores marcas.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#29A2A1]/10">
                  <CheckCircle2 className="w-6 h-6 text-[#29A2A1]" />
                </div>
                <h3 className="text-xl font-semibold text-black font-[var(--font-montserrat)]">
                  Atención personalizada
                </h3>
              </div>
              <p className="text-gray-600 font-[var(--font-inter)]">
                Nuestro equipo está capacitado para asesorarte en cada paso del proceso.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[#29A2A1]/10">
                  <CircleUser className="w-6 h-6 text-[#29A2A1]" />
                </div>
                <h3 className="text-xl font-semibold text-black font-[var(--font-montserrat)]">
                  Renta y venta
                </h3>
              </div>
              <p className="text-gray-600 font-[var(--font-inter)]">
                Opciones flexibles de renta o compra según tus necesidades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Productos de Ejemplo */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-3xl font-semibold text-black text-center mb-8 font-[var(--font-montserrat)]">
          Productos destacados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Producto 1 */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4 p-4 rounded-lg bg-[#29A2A1]/10">
                <CircleUser className="w-12 h-12 text-[#29A2A1]" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2 font-[var(--font-montserrat)]">
                Silla de Ruedas Premium
              </h3>
              <p className="text-gray-600 mb-4 font-[var(--font-inter)]">
                Silla de ruedas ergonómica con ajustes personalizados para máximo confort y movilidad.
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-[#29A2A1] font-[var(--font-montserrat)]">
                  $2,500
                </span>
                <span className="text-sm text-gray-500 font-[var(--font-inter)]">/mes renta</span>
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 transition-all duration-200">
                Ver detalles
              </button>
            </div>
          </div>

          {/* Producto 2 */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4 p-4 rounded-lg bg-[#29A2A1]/10">
                <Package className="w-12 h-12 text-[#29A2A1]" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2 font-[var(--font-montserrat)]">
                Corsé Ortopédico
              </h3>
              <p className="text-gray-600 mb-4 font-[var(--font-inter)]">
                Corsé lumbar ajustable para corrección postural y alivio de dolores de espalda.
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-[#29A2A1] font-[var(--font-montserrat)]">
                  $850
                </span>
                <span className="text-sm text-gray-500 font-[var(--font-inter)]">unidad</span>
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 transition-all duration-200">
                Ver detalles
              </button>
            </div>
          </div>

          {/* Producto 3 */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4 p-4 rounded-lg bg-[#29A2A1]/10">
                <Stethoscope className="w-12 h-12 text-[#29A2A1]" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2 font-[var(--font-montserrat)]">
                Andadera con Ruedas
              </h3>
              <p className="text-gray-600 mb-4 font-[var(--font-inter)]">
                Andadera plegable con ruedas para facilitar la movilidad y estabilidad.
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-[#29A2A1] font-[var(--font-montserrat)]">
                  $1,200
                </span>
                <span className="text-sm text-gray-500 font-[var(--font-inter)]">/mes renta</span>
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#29A2A1] hover:bg-[#20626C] active:bg-[#1C6C53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#29A2A1]/50 transition-all duration-200">
                Ver detalles
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
