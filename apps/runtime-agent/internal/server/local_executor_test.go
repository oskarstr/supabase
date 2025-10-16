package server

import (
	"context"
	"errors"
	"testing"

	"github.com/spf13/afero"

	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

type recordingRunner struct {
	calls   []string
	sawStop bool
}

func (r *recordingRunner) Start(_ context.Context, _ afero.Fs, _ []string, _ bool) error {
	r.calls = append(r.calls, "start")
	if !r.sawStop {
		return errors.New("start called without prior stop")
	}
	return nil
}

func (r *recordingRunner) Stop(context.Context, bool, string, bool, afero.Fs) error {
	r.calls = append(r.calls, "stop")
	r.sawStop = true
	return nil
}

func TestProvisionStopsBeforeStart(t *testing.T) {
	runner := &recordingRunner{}
	executor := newLocalExecutorWithRunner(runner)

	projectRoot := t.TempDir()
	req := provisionRequest{
		ProjectID:         1,
		ProjectRef:        "test-ref",
		ProjectName:       "test-name",
		OrganizationSlug:  "org",
		ProjectRoot:       projectRoot,
		CloudProvider:     "local",
		Region:            "region",
		DatabasePassword:  "password",
		ExcludedServices:  nil,
		NetworkID:         "net",
		IgnoreHealthCheck: true,
	}

	_, _ = executor.Provision(context.Background(), req)

	if len(runner.calls) == 0 {
		t.Fatalf("expected runner to be invoked")
	}

	if len(runner.calls) < 2 || runner.calls[0] != "stop" || runner.calls[1] != "start" {
		t.Fatalf("expected stop before start, got %v", runner.calls)
	}
}

type notRunningStopRunner struct {
	recordingRunner
}

func (r *notRunningStopRunner) Stop(ctx context.Context, backup bool, projectRef string, all bool, fsys afero.Fs) error {
	r.recordingRunner.Stop(ctx, backup, projectRef, all, fsys)
	return utils.ErrNotRunning
}

func TestProvisionAllowsStopNotRunning(t *testing.T) {
	runner := &notRunningStopRunner{}
	executor := newLocalExecutorWithRunner(runner)

	projectRoot := t.TempDir()
	req := provisionRequest{
		ProjectID:         1,
		ProjectRef:        "test-ref",
		ProjectName:       "test-name",
		OrganizationSlug:  "org",
		ProjectRoot:       projectRoot,
		CloudProvider:     "local",
		Region:            "region",
		DatabasePassword:  "password",
		ExcludedServices:  nil,
		NetworkID:         "net",
		IgnoreHealthCheck: true,
	}

	if _, err := executor.Provision(context.Background(), req); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if len(runner.calls) < 2 || runner.calls[0] != "stop" || runner.calls[1] != "start" {
		t.Fatalf("expected stop before start even when stop reports not running, got %v", runner.calls)
	}
}
