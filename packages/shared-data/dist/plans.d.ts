export type PlanId = 'free' | 'pro' | 'team' | 'enterprise';
export interface PricingInformation {
    id: string;
    planId: PlanId;
    name: string;
    nameBadge?: string;
    costUnit?: string;
    href: string;
    priceLabel?: string;
    priceMonthly: number | string;
    warning?: string;
    warningTooltip?: string;
    description: string;
    preface: string;
    features: (string | string[])[];
    footer?: string;
    cta: string;
}
export declare const plans: PricingInformation[];
//# sourceMappingURL=plans.d.ts.map