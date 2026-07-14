import React from "react";
import { 
  User, Sparkles, Shield, Cpu, Flame, Smile, Target, Trophy 
} from "lucide-react";

// List of available gradient mappings
export const GRADIENTS: Record<string, string> = {
  "gradient-1": "bg-gradient-to-tr from-amber-500 to-rose-500 text-white border-rose-300",
  "gradient-2": "bg-gradient-to-tr from-teal-400 to-emerald-600 text-white border-emerald-300",
  "gradient-3": "bg-gradient-to-tr from-blue-500 to-indigo-600 text-white border-indigo-300",
  "gradient-4": "bg-gradient-to-tr from-purple-500 to-fuchsia-600 text-white border-fuchsia-300",
  "gradient-5": "bg-gradient-to-tr from-yellow-400 to-orange-500 text-white border-orange-300",
  "gradient-6": "bg-gradient-to-tr from-neutral-700 to-neutral-900 text-white border-neutral-600",
};

// List of available icon mappings
export const ICONS: Record<string, React.ComponentType<any>> = {
  user: User,
  sparkles: Sparkles,
  shield: Shield,
  cpu: Cpu,
  flame: Flame,
  smile: Smile,
  target: Target,
  trophy: Trophy,
};

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  className?: string;
  size?: number; // Size in pixels for icon, defaults to automatic based on container
}

export default function UserAvatar({ 
  avatarUrl: rawAvatarUrl, 
  fullName, 
  email, 
  className = "w-8 h-8", 
  size 
}: UserAvatarProps) {
  
  const avatarUrl = rawAvatarUrl ? rawAvatarUrl.split("#")[0] : null;
  // Helper to extract initials
  const getInitials = () => {
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  // Check if it's a custom gradient+icon avatar
  if (avatarUrl && avatarUrl.includes("|")) {
    const parts = avatarUrl.split("|");
    let gradientKey = "";
    let iconKey = "";

    parts.forEach((part) => {
      if (part.startsWith("gradient:")) {
        gradientKey = part.replace("gradient:", "");
      } else if (part.startsWith("icon:")) {
        iconKey = part.replace("icon:", "");
      }
    });

    const gradientClass = GRADIENTS[gradientKey] || GRADIENTS["gradient-1"];
    const IconComponent = ICONS[iconKey];

    return (
      <div 
        className={`${className} ${gradientClass} rounded-sm flex items-center justify-center border font-semibold select-none shrink-0 overflow-hidden shadow-sm`}
      >
        {IconComponent ? (
          <IconComponent style={size ? { width: size, height: size } : undefined} className={size ? "" : "w-1/2 h-1/2"} />
        ) : (
          <span className={size ? "text-xs" : "text-[10px]"}>{getInitials()}</span>
        )}
      </div>
    );
  }

  // Check if it's explicit initials selection
  if (avatarUrl && avatarUrl.startsWith("initials:")) {
    const initialText = avatarUrl.replace("initials:", "").toUpperCase().slice(0, 2) || getInitials();
    return (
      <div 
        className={`${className} bg-primary/10 border border-primary/20 text-primary rounded-sm flex items-center justify-center font-bold select-none shrink-0 overflow-hidden`}
      >
        <span className={size ? `text-[${Math.max(10, size - 10)}px]` : "text-[10px] tracking-tighter"}>{initialText}</span>
      </div>
    );
  }

  // Check if it's a standard URL
  if (avatarUrl && (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("/"))) {
    return (
      <div className={`${className} rounded-sm overflow-hidden shrink-0 border border-neutral-200`}>
        <img 
          src={avatarUrl} 
          alt={fullName || "User Avatar"} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback on error
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  // Fallback to initials avatar
  return (
    <div 
      className={`${className} bg-neutral-200 border border-neutral-300 text-neutral-600 rounded-sm flex items-center justify-center font-semibold select-none shrink-0`}
    >
      <span className="text-[10px] tracking-tight">{getInitials()}</span>
    </div>
  );
}
