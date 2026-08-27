import { motion } from "framer-motion";

export interface RingingItem {
    id: string;
    kind: "task" | "class";
    label: string;
}

export default function AlarmRingModal({
                                           item,
                                           onTick,
                                           onReject,
                                           onDismiss,
                                       }: {
    item: RingingItem;
    onTick: () => void;
    onReject: () => void;
    onDismiss: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink/95 z-[100] flex flex-col items-center justify-center gap-6 px-6"
        >
            <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-amber text-sm tracking-widest font-semibold"
            >
                {item.kind === "class" ? "CLASS STARTING" : "TASK TIME"}
            </motion.div>
            <div className="font-display font-bold text-3xl text-center max-w-sm">{item.label}</div>

            {item.kind === "task" ? (
                <div className="flex gap-4 mt-4">
                    <button onClick={onTick} className="bg-mint text-ink font-semibold rounded-2xl px-8 py-4 text-lg">
                        ✓ Done
                    </button>
                    <button onClick={onReject} className="bg-coral text-ink font-semibold rounded-2xl px-8 py-4 text-lg">
                        ✕ Didn't do it
                    </button>
                </div>
            ) : (
                <button onClick={onDismiss} className="bg-amber text-ink font-semibold rounded-2xl px-8 py-4 text-lg mt-4">
                    Dismiss
                </button>
            )}
        </motion.div>
    );
}