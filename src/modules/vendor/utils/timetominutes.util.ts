const timeToMinutes = (time?: string): number | null => {
    if (!time) return null;

    const [hours, minutes]: any = time.split(":").map(Number);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return hours * 60 + minutes;
};

export const isProductAvailableNow = (availability: any): boolean => {
    if (!availability || availability.type !== "scheduled") {
        return true;
    }

    const fromMinutes = timeToMinutes(availability.fromTime);
    const toMinutes = timeToMinutes(availability.toTime);

    if (fromMinutes === null || toMinutes === null) {
        return true;
    }

    const now = new Date();

    // India timezone
    const indiaTime = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);

    const currentHour = Number(
        indiaTime.find((part) => part.type === "hour")?.value ?? 0
    );

    const currentMinute = Number(
        indiaTime.find((part) => part.type === "minute")?.value ?? 0
    );

    const nowMinutes = currentHour * 60 + currentMinute;

    // Normal schedule e.g. 09:00 -> 22:00
    if (fromMinutes <= toMinutes) {
        return (
            nowMinutes >= fromMinutes &&
            nowMinutes <= toMinutes
        );
    }

    // Overnight schedule e.g. 18:00 -> 02:00
    return (
        nowMinutes >= fromMinutes ||
        nowMinutes <= toMinutes
    );
};