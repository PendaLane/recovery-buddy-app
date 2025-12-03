import React from 'react';
import { Info, HeartHandshake, Shield, Sparkles } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Info className="text-penda-purple" size={22} />
        <div>
          <h2 className="text-2xl font-bold text-penda-purple">About My Recovery Buddy</h2>
          <p className="text-sm text-penda-light">A stand-alone companion by Penda Lane Behavioral Health.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-penda-border rounded-soft p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-penda-purple font-semibold text-sm">
            <HeartHandshake size={18} />
            <span>Purpose-built support</span>
          </div>
          <p className="text-sm text-penda-text/80">
            My Recovery Buddy keeps meetings, journals, safety tools, and accountability in one place so you can focus on your recovery.
          </p>
          <p className="text-sm text-penda-text/80">
            Everything runs inside this app—no WordPress pages or external portals required.
          </p>
        </div>

        <div className="bg-white border border-penda-border rounded-soft p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-penda-purple font-semibold text-sm">
            <Shield size={18} />
            <span>Data & access</span>
          </div>
          <p className="text-sm text-penda-text/80">
            Your profile, meeting logs, and notes sync through our Vercel backend for continuity across sessions. You can sign in or out anytime from My Account.
          </p>
        </div>
      </div>

      <div className="bg-white border border-penda-border rounded-soft p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-penda-purple font-semibold text-sm">
          <Sparkles size={18} />
          <span>Questions or feedback?</span>
        </div>
        <p className="text-sm text-penda-text/80">
          We’re continually improving the experience. Share what you’d like to see next so we can make My Recovery Buddy even more supportive.
        </p>
      </div>
    </div>
  );
};
