declare const config: {
    readonly auth: {
        readonly rate_limits: {
            readonly email: {
                /**
                 * The number of emails that can be sent per hour using the inbuilt email server.
                 */
                readonly inbuilt_smtp_per_hour: {
                    readonly value: 2;
                };
            };
            readonly magic_link: {
                /**
                 * Wait time between requests.
                 */
                readonly period: {
                    readonly value: 60;
                    readonly unit: "seconds";
                };
                /**
                 * How long before a Magic Link expires.
                 */
                readonly validity: {
                    readonly value: 1;
                    readonly unit: "hour";
                };
            };
            readonly otp: {
                /**
                 * Wait time between requests.
                 */
                readonly period: {
                    readonly value: 60;
                    readonly unit: "seconds";
                };
                /**
                 * How long before an OTP expires.
                 */
                readonly validity: {
                    readonly value: 1;
                    readonly unit: "hour";
                };
                /**
                 * How many OTPs can be requested per hour.
                 */
                readonly requests_per_hour: {
                    readonly value: 30;
                };
            };
            readonly signup_confirmation: {
                /**
                 * Wait time between requests.
                 */
                readonly period: {
                    readonly value: 60;
                    readonly unit: "seconds";
                };
            };
            readonly password_reset: {
                /**
                 * Wait time between requests.
                 */
                readonly period: {
                    readonly value: 60;
                    readonly unit: "seconds";
                };
            };
            readonly verification: {
                readonly requests_per_hour: {
                    readonly value: 360;
                };
                readonly requests_burst: {
                    readonly value: 30;
                };
            };
            readonly token_refresh: {
                readonly requests_per_hour: {
                    readonly value: 1800;
                };
                readonly requests_burst: {
                    readonly value: 30;
                };
            };
            readonly mfa: {
                readonly requests_per_hour: {
                    readonly value: 15;
                };
                readonly requests_burst: {
                    readonly value: 30;
                };
            };
            readonly anonymous_signin: {
                readonly requests_per_hour: {
                    readonly value: 30;
                };
                readonly requests_burst: {
                    readonly value: 30;
                };
            };
        };
        readonly hook_timeouts: {
            readonly postgres_hooks: {
                readonly value: 2;
            };
            readonly http_hooks: {
                readonly value: 5;
            };
        };
    };
    readonly branching: {
        readonly inactivity_period_in_minutes: {
            readonly value: 5;
        };
    };
    readonly pausing: {
        /**
         * Inactivity period after which projects may be paused.
         */
        readonly free_tier: {
            readonly value: "1";
            readonly unit: "week";
        };
    };
};
export default config;
//# sourceMappingURL=config.d.ts.map