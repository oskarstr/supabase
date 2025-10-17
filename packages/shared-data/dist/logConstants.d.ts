type LogTable = 'edge_logs' | 'postgres_logs' | 'function_logs' | 'function_edge_logs' | 'auth_logs' | 'auth_audit_logs' | 'realtime_logs' | 'storage_logs' | 'postgrest_logs' | 'supavisor_logs' | 'pgbouncer_logs' | 'pg_cron_logs' | 'pg_upgrade_logs';
type LogSchema = {
    name: string;
    reference: LogTable;
    fields: {
        path: string;
        type: string;
    }[];
};
declare const _default: {
    schemas: LogSchema[];
};
export default _default;
//# sourceMappingURL=logConstants.d.ts.map