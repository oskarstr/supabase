# Runtime Agent (WIP)

The runtime agent exposes a small HTTP API that the platform control-plane can call to orchestrate project runtimes.
It replaces direct `supabase start/stop` shell-outs from inside the platform container so we can manage Docker
resources from a host-visible process and grow into multiple backends (local Docker, Fly Machines, AWS, …).

## Endpoints

All endpoints are prefixed with `/v1`.

- `POST /v1/projects/provision` – provision or update a project runtime.
- `POST /v1/projects/stop` – pause the project runtime.
- `POST /v1/projects/destroy` – tear the project runtime down.
- `GET /healthz` – liveness probe.

The current implementation shells out to the Supabase CLI and returns once each command completes, so callers get the
same synchronous behaviour they relied on when the platform invoked the CLI directly. Follow-up work can stream logs,
surface operation metadata, and gradually replace the CLI dependency with native orchestration backends.

## Configuration

Environment variables (defaults in parentheses):

- `RUNTIME_AGENT_LISTEN_ADDR` (`:8085`) – bind address.
- `RUNTIME_AGENT_READ_TIMEOUT` (`30s`)
- `RUNTIME_AGENT_READ_HEADER_TIMEOUT` (`10s`)
- `RUNTIME_AGENT_WRITE_TIMEOUT` (`30s`)
- `RUNTIME_AGENT_IDLE_TIMEOUT` (`60s`)
- `RUNTIME_AGENT_COMMAND_TIMEOUT` (`15m`)
- `RUNTIME_AGENT_SUPABASE_CLI_PATH` (`supabase`)

Run it in Docker with access to the host Docker socket and platform runtime directories, ideally on `--network host`
so health probes match what the control-plane sees.
