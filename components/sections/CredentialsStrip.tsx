import { credentials } from "@/lib/content";

export function CredentialsStrip() {
  return (
    <div className="cred">
      <div className="wrap cred-inner">
        {credentials.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
