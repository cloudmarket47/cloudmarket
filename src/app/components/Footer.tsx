import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { useBrandingSettings } from '../lib/branding';
import { grantAdminAccess } from '../lib/adminAccess';

const ADMIN_UNLOCK_CLICKS = 5;
const ADMIN_UNLOCK_WINDOW_MS = 6000;

export function Footer() {
  const branding = useBrandingSettings();
  const navigate = useNavigate();
  const adminTapStateRef = useRef({ count: 0, lastTapAt: 0 });

  const handleCopyrightTap = () => {
    const now = Date.now();
    const tapState = adminTapStateRef.current;

    if (now - tapState.lastTapAt > ADMIN_UNLOCK_WINDOW_MS) {
      tapState.count = 0;
    }

    tapState.count += 1;
    tapState.lastTapAt = now;

    if (tapState.count >= ADMIN_UNLOCK_CLICKS) {
      tapState.count = 0;
      grantAdminAccess();
      navigate('/admin');
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#0E7C7B] to-[#2B7FFF]">
                <img src={branding.logoUrl} alt={`${branding.companyName} logo`} className="h-full w-full object-cover" />
              </div>
              <span className="font-bold text-xl">{branding.companyName}</span>
            </div>
            <p className="text-gray-400 text-sm">
              {branding.companyName} brings products, offers, and checkout into one clean shopping experience.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Contact Us</h3>
            <div className="space-y-2 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>+234 800 000 0000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>support@crevicebrush.ng</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Lagos, Nigeria</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Delivery Info</h3>
            <div className="space-y-2 text-gray-400 text-sm">
              <p>Free delivery across Nigeria</p>
              <p>Pay on delivery available</p>
              <p>1-3 days for major cities</p>
              <p>3-5 days for other locations</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg">Follow Us</h3>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-400 text-sm">
              Stay updated with our latest offers and cleaning tips.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
          <button
            type="button"
            onClick={handleCopyrightTap}
            className="cursor-default text-gray-400 transition-colors hover:text-gray-300"
            aria-label="Copyright notice"
            title="Copyright"
          >
            &copy; 2026 {branding.companyName}. All rights reserved.
          </button>
        </div>
      </div>
    </footer>
  );
}
