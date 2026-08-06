import { siteConfig } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/ui/Icons";

export function WhatsAppFloat() {
  return (
    <a
      className="wa-float"
      href={siteConfig.whatsappUrl}
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon />
    </a>
  );
}
