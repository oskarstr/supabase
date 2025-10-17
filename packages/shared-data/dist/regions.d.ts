export type CloudProvider = 'FLY' | 'AWS' | 'AWS_K8S' | 'AWS_NIMBUS' | 'LOCAL';
export type Region = Partial<typeof AWS_REGIONS> | Partial<typeof FLY_REGIONS> | Partial<typeof LOCAL_REGIONS>;
export declare const AWS_REGIONS: {
    readonly WEST_US: {
        readonly code: "us-west-1";
        readonly displayName: "West US (North California)";
        readonly location: readonly [37.774929, -122.419418];
    };
    readonly EAST_US: {
        readonly code: "us-east-1";
        readonly displayName: "East US (North Virginia)";
        readonly location: readonly [37.926868, -78.024902];
    };
    readonly EAST_US_2: {
        readonly code: "us-east-2";
        readonly displayName: "East US (Ohio)";
        readonly location: readonly [39.9612, -82.9988];
    };
    readonly CENTRAL_CANADA: {
        readonly code: "ca-central-1";
        readonly displayName: "Canada (Central)";
        readonly location: readonly [56.130367, -106.346771];
    };
    readonly WEST_EU: {
        readonly code: "eu-west-1";
        readonly displayName: "West EU (Ireland)";
        readonly location: readonly [53.3498, -6.2603];
    };
    readonly WEST_EU_2: {
        readonly code: "eu-west-2";
        readonly displayName: "West Europe (London)";
        readonly location: readonly [51.507351, -0.127758];
    };
    readonly WEST_EU_3: {
        readonly code: "eu-west-3";
        readonly displayName: "West EU (Paris)";
        readonly location: readonly [2.352222, 48.856613];
    };
    readonly CENTRAL_EU: {
        readonly code: "eu-central-1";
        readonly displayName: "Central EU (Frankfurt)";
        readonly location: readonly [50.110924, 8.682127];
    };
    readonly CENTRAL_EU_2: {
        readonly code: "eu-central-2";
        readonly displayName: "Central Europe (Zurich)";
        readonly location: readonly [47.3744489, 8.5410422];
    };
    readonly NORTH_EU: {
        readonly code: "eu-north-1";
        readonly displayName: "North EU (Stockholm)";
        readonly location: readonly [59.3251172, 18.0710935];
    };
    readonly SOUTH_ASIA: {
        readonly code: "ap-south-1";
        readonly displayName: "South Asia (Mumbai)";
        readonly location: readonly [18.9733536, 72.8281049];
    };
    readonly SOUTHEAST_ASIA: {
        readonly code: "ap-southeast-1";
        readonly displayName: "Southeast Asia (Singapore)";
        readonly location: readonly [1.357107, 103.8194992];
    };
    readonly NORTHEAST_ASIA: {
        readonly code: "ap-northeast-1";
        readonly displayName: "Northeast Asia (Tokyo)";
        readonly location: readonly [35.6895, 139.6917];
    };
    readonly NORTHEAST_ASIA_2: {
        readonly code: "ap-northeast-2";
        readonly displayName: "Northeast Asia (Seoul)";
        readonly location: readonly [37.5665, 126.978];
    };
    readonly OCEANIA: {
        readonly code: "ap-southeast-2";
        readonly displayName: "Oceania (Sydney)";
        readonly location: readonly [-33.8688, 151.2093];
    };
    readonly SOUTH_AMERICA: {
        readonly code: "sa-east-1";
        readonly displayName: "South America (São Paulo)";
        readonly location: readonly [-1.2043218, -47.1583944];
    };
};
export type AWS_REGIONS_KEYS = keyof typeof AWS_REGIONS;
export declare const FLY_REGIONS: {
    readonly SOUTHEAST_ASIA: {
        readonly code: "sin";
        readonly displayName: "Singapore";
        readonly location: readonly [1.3521, 103.8198];
    };
};
export declare const LOCAL_REGIONS: {
    readonly LOCAL_DEV: {
        readonly code: "local-dev";
        readonly displayName: "Local Development";
        readonly location: readonly [0, 0];
    };
};
export declare const SMART_REGION_TO_EXACT_REGION_MAP: Map<string, string>;
//# sourceMappingURL=regions.d.ts.map