import { WEBSITE_URL } from "@plane/constants";
import { Github } from "lucide-react";

type TPoweredBy = {
  disabled?: boolean;
};

export function PoweredBy(props: TPoweredBy) {
  const { disabled = false } = props;

  if (disabled || !WEBSITE_URL) return null;

  return (
    <a
      href="https://github.com/SamalehZen/planeKANBAN"
      className="fixed bottom-2.5 right-5 !z-[999999] flex items-center gap-1 rounded-sm border border-subtle bg-layer-3 px-2 py-1 shadow-raised-100"
      target="_blank"
      rel="noreferrer noopener"
    >
      <Github className="h-3 w-3 text-primary" />
      <div className="text-11">
        Powered by <span className="font-semibold">HyperPLANE</span>
      </div>
    </a>
  );
}
