// ui
import { Button } from "@plane/propel/button";

function ErrorPage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="bg-surface-1 grid h-screen place-items-center p-4">
      <div className="space-y-8 text-center">
        <div className="space-y-2">
          <h3 className="text-16 font-semibold">Yikes! That doesn{"'"}t look good.</h3>
          <p className="mx-auto md:w-1/2 text-13 text-secondary">
            That crashed HyperPLANE. No worries, though. Our engineers have been notified. If you have more
            details, please write to{" "}
            <a href="mailto:samaleh2017@gmail.com" className="text-accent-primary">
              samaleh2017@gmail.com
            </a>{" "}
            or on our{" "}
            <a
              href="https://wa.me/25377354995"
              target="_blank"
              className="text-accent-primary"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            .
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="primary" size="lg" onClick={handleRetry}>
            Refresh
          </Button>
          {/* <Button variant="secondary" size="lg" onClick={() => {}}>
            Sign out
          </Button> */}
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
