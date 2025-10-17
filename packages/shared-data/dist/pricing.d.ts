type Pricing = {
    database: PricingCategory;
    auth: PricingCategory;
    storage: PricingCategory;
    edge_functions: PricingCategory;
    realtime: PricingCategory;
    dashboard: PricingCategory;
    security: PricingCategory;
    support: PricingCategory;
};
type PricingCategory = {
    title: string;
    icon: string;
    features: PricingFeature[];
};
type PricingFeature = {
    title: string;
    key: FeatureKey;
    plans: {
        free: boolean | string | string[];
        pro: boolean | string | string[];
        team: boolean | string | string[];
        enterprise: boolean | string | string[];
    };
    usage_based: boolean;
};
export type FeatureKey = 'database.dedicatedPostgresDatabase' | 'database.unlimitedApiRequests' | 'database.size' | 'database.advancedDiskConfig' | 'database.automaticBackups' | 'database.pitr' | 'database.pausing' | 'database.branching' | 'database.egress' | 'database.cachedEgress' | 'auth.totalUsers' | 'auth.maus' | 'auth.userDataOwnership' | 'auth.anonSignIns' | 'auth.socialOAuthProviders' | 'auth.customSMTPServer' | 'auth.removeSupabaseBranding' | 'auth.auditTrails' | 'auth.basicMFA' | 'auth.advancedMFAPhone' | 'auth.thirdPartyMAUs' | 'auth.saml' | 'auth.leakedPasswordProtection' | 'auth.singleSessionPerUser' | 'auth.sessionTimeouts' | 'auth.authHooks' | 'auth.advancedSecurityFeatures' | 'storage.size' | 'storage.customAccessControls' | 'storage.maxFileSize' | 'storage.cdn' | 'storage.transformations' | 'storage.byoc' | 'functions.invocations' | 'functions.scriptSize' | 'functions.numberOfFunctions' | 'realtime.postgresChanges' | 'realtime.concurrentConnections' | 'realtime.messagesPerMonth' | 'realtime.maxMessageSize' | 'dashboard.teamMembers' | 'dashboard.auditTrails' | 'security.byoc' | 'security.logRetention' | 'security.logDrain' | 'security.metricsEndpoint' | 'security.soc2' | 'security.hipaa' | 'security.sso' | 'security.uptimeSla' | 'security.accessRoles' | 'security.vanityUrls' | 'security.customDomains' | 'support.communitySupport' | 'support.emailSupport' | 'support.emailSupportSla' | 'support.designatedSupport' | 'support.onBoardingSupport' | 'support.designatedCustomerSuccessTeam' | 'support.securityQuestionnaireHelp';
export declare const pricing: Pricing;
export {};
//# sourceMappingURL=pricing.d.ts.map