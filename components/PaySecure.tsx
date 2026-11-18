import { siPaypal, siApplepay, siVisa, siMastercard, siGooglepay, siDiscover, siAmericanexpress } from "simple-icons";

const LOGOS = [siPaypal, siApplepay, siGooglepay, siVisa, siMastercard, siDiscover, siAmericanexpress];

export default function PaySecure() {
  return (
    <div className="paysafe">
      <div className="paysafe-pill">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        Pay safe &amp; secure
      </div>
      <div className="paysafe-logos">
        {LOGOS.map((l) => (
          <span key={l.slug} className="paylogo" title={l.title}>
            <svg viewBox="0 0 24 24" role="img" aria-label={l.title}>
              <path d={l.path} fill={`#${l.hex}`} />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
