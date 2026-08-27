import { useState } from "react";
import { unlockAudio, isUnlocked } from "@/lib/audioUnlock";

export default function EnableAlarmsBanner() {
    const [dismissed, setDismissed] = useState(isUnlocked());
    if (dismissed) return null;
    return (
        <div className="bg-amber text-ink rounded-xl px-4 py-3 mb-4 flex items-center justify-between text-sm font-medium">
            <span>Tap once to enable alarm sound on this device</span>
            <button
                onClick={() => { unlockAudio(); setDismissed(true); }}
                className="bg-ink text-amber rounded-lg px-3 py-1 text-xs font-semibold"
            >
                Enable
            </button>
        </div>
    );
}