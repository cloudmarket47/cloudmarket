import { Phone, Mail } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">CB</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Crevice Brush Ghana</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+233" className="flex items-center gap-2 text-gray-700 hover:text-[#0E7C7B]">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Call Us</span>
            </a>
            <a href="mailto:info@crevicebrush.com" className="flex items-center gap-2 text-gray-700 hover:text-[#0E7C7B]">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
