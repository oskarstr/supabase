package server

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

type Server struct {
	cfg      Config
	server   *http.Server
	router   http.Handler
	executor executor
}

type operationResult struct {
	Stdout     string `json:"stdout,omitempty"`
	Stderr     string `json:"stderr,omitempty"`
	DurationMs int64  `json:"duration_ms"`
}

func New(cfg Config) *Server {
	s := &Server{
		cfg:      cfg,
		executor: newLocalExecutor(),
	}
	s.router = s.routes()
	s.server = &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           s.router,
		ReadTimeout:       cfg.ReadTimeout,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}
	return s
}

func (s *Server) Start() error {
	return s.server.ListenAndServe()
}

func (s *Server) Stop(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *Server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/projects/provision", s.handleProvision)
	mux.HandleFunc("POST /v1/projects/stop", s.handleStop)
	mux.HandleFunc("POST /v1/projects/destroy", s.handleDestroy)
	mux.HandleFunc("GET /healthz", s.handleHealthz)
	return loggingMiddleware(mux)
}

type provisionRequest struct {
	ProjectID         int      `json:"project_id"`
	ProjectRef        string   `json:"project_ref"`
	ProjectName       string   `json:"project_name"`
	OrganizationSlug  string   `json:"organization_slug"`
	ProjectRoot       string   `json:"project_root"`
	CloudProvider     string   `json:"cloud_provider"`
	Region            string   `json:"region"`
	DatabasePassword  string   `json:"database_password"`
	ExcludedServices  []string `json:"excluded_services"`
	NetworkID         string   `json:"network_id"`
	IgnoreHealthCheck bool     `json:"ignore_health_check"`
}

type stopRequest struct {
	ProjectRef  string `json:"project_ref"`
	ProjectRoot string `json:"project_root"`
}

type destroyRequest struct {
	ProjectRef       string `json:"project_ref"`
	ProjectRoot      string `json:"project_root"`
	OrganizationSlug string `json:"organization_slug"`
}

func (s *Server) handleProvision(w http.ResponseWriter, r *http.Request) {
	var req provisionRequest
	if err := decodeJSON(r, &req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	if err := validateProvisionRequest(req); err != nil {
		httpError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx, cancel := s.operationContext(r.Context())
	defer cancel()

	result, err := s.executor.Provision(ctx, req)
	if err != nil {
		log.Error().
			Err(err).
			Int("project_id", req.ProjectID).
			Str("project_ref", req.ProjectRef).
			Msg("provision failed")
		respondJSON(w, http.StatusInternalServerError, map[string]any{
			"status": "failed",
			"error":  err.Error(),
			"result": result,
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"status": "completed",
		"result": result,
	})
}

func (s *Server) handleStop(w http.ResponseWriter, r *http.Request) {
	var req stopRequest
	if err := decodeJSON(r, &req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	if strings.TrimSpace(req.ProjectRef) == "" {
		httpError(w, http.StatusBadRequest, "project_ref is required")
		return
	}
	if strings.TrimSpace(req.ProjectRoot) == "" {
		httpError(w, http.StatusBadRequest, "project_root is required")
		return
	}

	ctx, cancel := s.operationContext(r.Context())
	defer cancel()

	result, err := s.executor.Stop(ctx, req)
	if err != nil {
		log.Error().
			Err(err).
			Str("project_ref", req.ProjectRef).
			Msg("stop failed")
		respondJSON(w, http.StatusInternalServerError, map[string]any{
			"status": "failed",
			"error":  err.Error(),
			"result": result,
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"status": "completed",
		"result": result,
	})
}

func (s *Server) handleDestroy(w http.ResponseWriter, r *http.Request) {
	var req destroyRequest
	if err := decodeJSON(r, &req); err != nil {
		httpError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	if strings.TrimSpace(req.ProjectRef) == "" {
		httpError(w, http.StatusBadRequest, "project_ref is required")
		return
	}
	if strings.TrimSpace(req.ProjectRoot) == "" {
		httpError(w, http.StatusBadRequest, "project_root is required")
		return
	}

	ctx, cancel := s.operationContext(r.Context())
	defer cancel()

	result, err := s.executor.Destroy(ctx, req)
	if err != nil {
		log.Error().
			Err(err).
			Str("project_ref", req.ProjectRef).
			Msg("destroy failed")
		respondJSON(w, http.StatusInternalServerError, map[string]any{
			"status": "failed",
			"error":  err.Error(),
			"result": result,
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"status": "completed",
		"result": result,
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func validateProvisionRequest(req provisionRequest) error {
	if req.ProjectID <= 0 {
		return errors.New("project_id must be positive")
	}
	if strings.TrimSpace(req.ProjectRef) == "" {
		return errors.New("project_ref is required")
	}
	if strings.TrimSpace(req.ProjectName) == "" {
		return errors.New("project_name is required")
	}
	if strings.TrimSpace(req.ProjectRoot) == "" {
		return errors.New("project_root is required")
	}
	if strings.TrimSpace(req.DatabasePassword) == "" {
		return errors.New("database_password is required")
	}
	if strings.TrimSpace(req.NetworkID) == "" {
		return errors.New("network_id is required")
	}
	return nil
}

func (s *Server) operationContext(parent context.Context) (context.Context, context.CancelFunc) {
	if s.cfg.CommandTimeout <= 0 {
		return context.WithCancel(parent)
	}
	return context.WithTimeout(parent, s.cfg.CommandTimeout)
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Error().Err(err).Msg("failed to write json response")
	}
}

func httpError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(ww, r)
		duration := time.Since(start)

		log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", ww.status).
			Dur("duration", duration).
			Msg("request")
	})
}

func decodeJSON(r *http.Request, dst any) error {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Error().Err(err).Msg("failed to read request body")
		return err
	}
	if err := json.Unmarshal(body, dst); err != nil {
		log.Error().Err(err).Str("body", string(body)).Msg("invalid json payload")
		return err
	}
	return nil
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (w *responseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

type executor interface {
	Provision(context.Context, provisionRequest) (operationResult, error)
	Stop(context.Context, stopRequest) (operationResult, error)
	Destroy(context.Context, destroyRequest) (operationResult, error)
}
