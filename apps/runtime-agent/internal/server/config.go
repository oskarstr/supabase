package server

import (
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Config struct {
	ListenAddr        string
	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	CommandTimeout    time.Duration
	AuthToken         string
	ProjectsRoot      string
}

func ConfigFromEnv() Config {
	addr := strings.TrimSpace(os.Getenv("RUNTIME_AGENT_LISTEN_ADDR"))
	if addr == "" {
		addr = ":8085"
	}

	readTimeout := parseDuration("RUNTIME_AGENT_READ_TIMEOUT", 30*time.Second)
	readHeaderTimeout := parseDuration("RUNTIME_AGENT_READ_HEADER_TIMEOUT", 10*time.Second)
	writeTimeout := parseDuration("RUNTIME_AGENT_WRITE_TIMEOUT", 30*time.Second)
	idleTimeout := parseDuration("RUNTIME_AGENT_IDLE_TIMEOUT", time.Minute)
	commandTimeout := parseDuration("RUNTIME_AGENT_COMMAND_TIMEOUT", 15*time.Minute)
	authToken := strings.TrimSpace(os.Getenv("RUNTIME_AGENT_AUTH_TOKEN"))
	projectsRoot := strings.TrimSpace(os.Getenv("RUNTIME_AGENT_PROJECTS_ROOT"))
	if projectsRoot != "" {
		if abs, err := filepath.Abs(projectsRoot); err == nil {
			projectsRoot = abs
		}
	}

	return Config{
		ListenAddr:        normalizeAddr(addr),
		ReadTimeout:       readTimeout,
		ReadHeaderTimeout: readHeaderTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
		CommandTimeout:    commandTimeout,
		AuthToken:         authToken,
		ProjectsRoot:      projectsRoot,
	}
}

func parseDuration(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	if d, err := time.ParseDuration(raw); err == nil {
		return d
	}
	return fallback
}

func normalizeAddr(addr string) string {
	if strings.HasPrefix(addr, ":") {
		return addr
	}

	if _, _, err := net.SplitHostPort(addr); err == nil {
		return addr
	}

	return ":" + addr
}
