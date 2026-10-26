export const MANUAL_DELIVERY_STATUS = {
    CREATED: "CREATED",
    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ACCEPTED",
    PICKED_UP: "PICKED_UP",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    REACHED: "REACHED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
} as const;

export type ManualDeliveryStatus =
    (typeof MANUAL_DELIVERY_STATUS)[keyof typeof MANUAL_DELIVERY_STATUS];

export const MANUAL_DELIVERY_SOURCE = {
    PHONE_CALL: "PHONE_CALL",
    VENDOR_APP: "VENDOR_APP",
    MANUAL_ENTRY: "MANUAL_ENTRY",
} as const;

export type ManualDeliverySource =
    (typeof MANUAL_DELIVERY_SOURCE)[keyof typeof MANUAL_DELIVERY_SOURCE];

export const DISTANCE_CALCULATION_METHOD = {
    ROAD: "ROAD",
    STRAIGHT_LINE: "STRAIGHT_LINE",
} as const;

export type DistanceCalculationMethod =
    (typeof DISTANCE_CALCULATION_METHOD)[keyof typeof DISTANCE_CALCULATION_METHOD];

export const MANUAL_DELIVERY_ASSIGNMENT_ACTION = {
    ASSIGNED: "ASSIGNED",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    REASSIGNED: "REASSIGNED",
    UNASSIGNED: "UNASSIGNED",
} as const;

export type ManualDeliveryAssignmentAction =
    (typeof MANUAL_DELIVERY_ASSIGNMENT_ACTION)[keyof typeof MANUAL_DELIVERY_ASSIGNMENT_ACTION];

/**
 * Valid state machine transitions.
 * Normal workflow:
 * CREATED -> ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> REACHED -> DELIVERED
 */
export const VALID_DELIVERY_TRANSITIONS: Record<
    ManualDeliveryStatus,
    ManualDeliveryStatus[]
> = {
    CREATED: [
        MANUAL_DELIVERY_STATUS.ASSIGNED,
        MANUAL_DELIVERY_STATUS.CANCELLED,
    ],
    ASSIGNED: [
        MANUAL_DELIVERY_STATUS.ACCEPTED,
        MANUAL_DELIVERY_STATUS.CREATED, // When driver rejects, resets to CREATED for reassignment
        MANUAL_DELIVERY_STATUS.CANCELLED,
    ],
    ACCEPTED: [
        MANUAL_DELIVERY_STATUS.PICKED_UP,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    PICKED_UP: [
        MANUAL_DELIVERY_STATUS.OUT_FOR_DELIVERY,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    OUT_FOR_DELIVERY: [
        MANUAL_DELIVERY_STATUS.REACHED,
        MANUAL_DELIVERY_STATUS.DELIVERED,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    REACHED: [
        MANUAL_DELIVERY_STATUS.DELIVERED,
        MANUAL_DELIVERY_STATUS.FAILED,
    ],
    DELIVERED: [],
    CANCELLED: [],
    FAILED: [],
};

export const TERMINAL_STATUSES: ManualDeliveryStatus[] = [
    MANUAL_DELIVERY_STATUS.DELIVERED,
    MANUAL_DELIVERY_STATUS.CANCELLED,
    MANUAL_DELIVERY_STATUS.FAILED,
];

export const EDITABLE_STATUSES: ManualDeliveryStatus[] = [
    MANUAL_DELIVERY_STATUS.CREATED,
];

export const STATUS_DISPLAY_TITLES: Record<ManualDeliveryStatus, string> = {
    CREATED: "Delivery Created",
    ASSIGNED: "Driver Assigned",
    ACCEPTED: "Delivery Accepted by Driver",
    PICKED_UP: "Package Picked Up",
    OUT_FOR_DELIVERY: "Out for Delivery",
    REACHED: "Driver Reached Customer Location",
    DELIVERED: "Delivery Completed",
    CANCELLED: "Delivery Cancelled",
    FAILED: "Delivery Failed",
};
