package server

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"
)

type stubExecutor struct {
	provisionCalls int
	stopCalls      int
	destroyCalls   int
}

func (s *stubExecutor) Provision(context.Context, provisionRequest) (operationResult, error) {
	s.provisionCalls++
	return operationResult{}, nil
}

func (s *stubExecutor) Stop(context.Context, stopRequest) (operationResult, error) {
	s.stopCalls++
	return operationResult{}, nil
}

func (s *stubExecutor) Destroy(context.Context, destroyRequest) (operationResult, error) {
	s.destroyCalls++
	return operationResult{}, nil
}

func TestRequireAuthRejectsMissingToken(t *testing.T) {
	root := t.TempDir()
	projectRoot := filepath.Join(root, "proj")

	srv := New(Config{
		AuthToken:      "secret-token",
		CommandTimeout: time.Minute,
		ProjectsRoot:   root,
	})
	srv.executor = &stubExecutor{}

	body := bytes.NewBufferString(`{"project_id":1,"project_ref":"ref","project_name":"name","organization_slug":"org","project_root":"` + projectRoot + `","cloud_provider":"aws","region":"region","database_password":"pass","excluded_services":[],"network_id":"net","ignore_health_check":true}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/projects/provision", body)
	res := httptest.NewRecorder()

	srv.router.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, res.Code)
	}
}

func TestRequireAuthAllowsValidToken(t *testing.T) {
	executor := &stubExecutor{}
	root := t.TempDir()
	projectRoot := filepath.Join(root, "proj")

	srv := New(Config{
		AuthToken:      "secret-token",
		CommandTimeout: time.Minute,
		ProjectsRoot:   root,
	})
	srv.executor = executor

	body := bytes.NewBufferString(`{"project_id":1,"project_ref":"ref","project_name":"name","organization_slug":"org","project_root":"` + projectRoot + `","cloud_provider":"aws","region":"region","database_password":"pass","excluded_services":[],"network_id":"net","ignore_health_check":true}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/projects/provision", body)
	req.Header.Set("Authorization", "Bearer secret-token")
	res := httptest.NewRecorder()

	srv.router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, res.Code)
	}
	if executor.provisionCalls != 1 {
		t.Fatalf("expected executor to be invoked once, got %d", executor.provisionCalls)
	}
}

func TestHealthzDoesNotRequireAuth(t *testing.T) {
	srv := New(Config{
		AuthToken:      "secret-token",
		CommandTimeout: time.Minute,
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()

	srv.router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, res.Code)
	}
}

func TestRejectsProjectRootOutsideAllowlist(t *testing.T) {
	root := t.TempDir()
	executor := &stubExecutor{}

	srv := New(Config{
		AuthToken:      "secret-token",
		CommandTimeout: time.Minute,
		ProjectsRoot:   root,
	})
	srv.executor = executor

	body := bytes.NewBufferString(`{"project_id":1,"project_ref":"ref","project_name":"name","organization_slug":"org","project_root":"/tmp/outside","cloud_provider":"aws","region":"region","database_password":"pass","excluded_services":[],"network_id":"net","ignore_health_check":true}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/projects/provision", body)
	req.Header.Set("Authorization", "Bearer secret-token")
	res := httptest.NewRecorder()

	srv.router.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, res.Code)
	}
	if executor.provisionCalls != 0 {
		t.Fatalf("expected executor not to be invoked, got %d", executor.provisionCalls)
	}
}
