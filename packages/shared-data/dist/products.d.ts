export type PRODUCT = PRODUCT_SHORTNAMES.DATABASE | PRODUCT_SHORTNAMES.AUTHENTICATION | PRODUCT_SHORTNAMES.STORAGE | PRODUCT_SHORTNAMES.FUNCTIONS | PRODUCT_SHORTNAMES.REALTIME;
export declare enum PRODUCT_NAMES {
    DATABASE = "Database",
    AUTHENTICATION = "Authentication",
    STORAGE = "Storage",
    FUNCTIONS = "Edge Functions",
    REALTIME = "Realtime"
}
export declare enum PRODUCT_SHORTNAMES {
    DATABASE = "database",
    AUTHENTICATION = "authentication",
    STORAGE = "storage",
    FUNCTIONS = "functions",
    REALTIME = "realtime"
}
export type PRODUCT_MODULE = PRODUCT_MODULES_SHORTNAMES.CRON | PRODUCT_MODULES_SHORTNAMES.QUEUES | PRODUCT_MODULES_SHORTNAMES.VECTOR;
export declare enum PRODUCT_MODULES_NAMES {
    CRON = "Cron",
    QUEUES = "Queues",
    VECTOR = "Vector"
}
export declare enum PRODUCT_MODULES_SHORTNAMES {
    CRON = "cron",
    QUEUES = "queues",
    VECTOR = "vector"
}
interface Icon {
    '16': string;
    '18': string;
    '24': string;
}
export interface ProductProps {
    name: PRODUCT_NAMES | PRODUCT_MODULES_NAMES;
    icon: Icon;
}
export type Products = {
    [product in PRODUCT]: ProductProps;
};
export type ProductModules = {
    [product in PRODUCT_MODULE]: ProductProps;
};
export declare const products: Products;
export declare const PRODUCT_MODULES: ProductModules;
export {};
//# sourceMappingURL=products.d.ts.map