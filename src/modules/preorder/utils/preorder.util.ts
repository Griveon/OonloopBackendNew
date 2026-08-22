import { PreorderOrderModel } from "../models/preorderorder.model.js";

/** Current time in IST as a Date (wall-clock shifted to Asia/Kolkata). */
export function istNow(): Date {
    return new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
}

/** Minute-of-day (0..1439) in IST right now. */
export function istMinutesNow(): number {
    const d = istNow();
    return d.getHours() * 60 + d.getMinutes();
}

/** "HH:mm" -> minutes-of-day. Returns null for invalid input. */
export function timeToMinutes(time: string): number | null {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return null;
    const [h, m] = time.split(":").map(Number);
    return (h as number) * 60 + (m as number);
}

/** Today's date in IST as a "YYYY-MM-DD" string. */
export function istDateStr(d: Date = istNow()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Add whole days to a "YYYY-MM-DD" string, returning a new "YYYY-MM-DD". */
export function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y as number, (m as number) - 1, d as number));
    dt.setUTCDate(dt.getUTCDate() + days);
    return istDateStr(new Date(dt.getTime()));
}

/** True when a <= b <= c for "YYYY-MM-DD" strings (lexicographic works). */
export function dateInRange(b: string, a: string, c: string): boolean {
    return b >= a && b <= c;
}

/** Unique-ish human order number: PRE-YYMMDD-XXXX. */
export async function generatePreorderNumber(): Promise<string> {
    const d = istNow();
    const stamp = `${String(d.getFullYear()).slice(2)}${String(
        d.getMonth() + 1
    ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    for (let i = 0; i < 5; i++) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const candidate = `PRE-${stamp}-${rand}`;
        const exists = await PreorderOrderModel.exists({
            orderNumber: candidate,
        });
        if (!exists) return candidate;
    }
    return `PRE-${stamp}-${Date.now().toString().slice(-5)}`;
}
