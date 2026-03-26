import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Droplets,
  Flame,
  Gift,
  Hand,
  Layers,
  MapPin,
  Maximize2,
  MessageSquare,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  Video,
  Zap,
} from 'lucide-react';

const productSectionIconMap: Record<string, LucideIcon> = {
  AlertTriangle,
  Droplets,
  Flame,
  Gift,
  Hand,
  Layers,
  MapPin,
  Maximize2,
  MessageSquare,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  Video,
  Zap,
};

export function resolveProductSectionIcon(iconName: string | undefined) {
  if (!iconName?.trim()) {
    return Sparkles;
  }

  return productSectionIconMap[iconName.trim()] ?? null;
}
