package server

import (
	"bytes"
	"context"
	"io"
	"os"
	"sync"
	"time"

	"github.com/spf13/afero"
	"github.com/spf13/viper"

	"github.com/supabase/supabase/apps/runtime-agent/internal/start"
	"github.com/supabase/supabase/apps/runtime-agent/internal/stop"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils/flags"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/config"
)

type localExecutor struct {
	mu sync.Mutex
}

func newLocalExecutor() *localExecutor {
	return &localExecutor{}
}

func (e *localExecutor) Provision(ctx context.Context, req provisionRequest) (operationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.runWithLogs(func() error {
		return e.withProjectEnvironment(req.ProjectRoot, req.ProjectRef, req.NetworkID, func(fsys afero.Fs) error {
			excluded := append([]string(nil), req.ExcludedServices...)
			return start.Run(ctx, fsys, excluded, req.IgnoreHealthCheck)
		})
	})
}

func (e *localExecutor) Stop(ctx context.Context, req stopRequest) (operationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.runWithLogs(func() error {
		return e.withProjectEnvironment(req.ProjectRoot, req.ProjectRef, "", func(fsys afero.Fs) error {
			const backupVolumes = false
			return stop.Run(ctx, backupVolumes, req.ProjectRef, false, fsys)
		})
	})
}

func (e *localExecutor) Destroy(ctx context.Context, req destroyRequest) (operationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.runWithLogs(func() error {
		return e.withProjectEnvironment(req.ProjectRoot, req.ProjectRef, "", func(fsys afero.Fs) error {
			const backupVolumes = false
			return stop.Run(ctx, backupVolumes, req.ProjectRef, false, fsys)
		})
	})
}

func (e *localExecutor) runWithLogs(fn func() error) (operationResult, error) {
	var result operationResult
	startTime := time.Now()

	originalStdout := os.Stdout
	originalStderr := os.Stderr

	stdoutReader, stdoutWriter, err := os.Pipe()
	if err != nil {
		return result, err
	}
	stderrReader, stderrWriter, err := os.Pipe()
	if err != nil {
		stdoutReader.Close()
		stdoutWriter.Close()
		return result, err
	}

	os.Stdout = stdoutWriter
	os.Stderr = stderrWriter

	var stdoutBuf, stderrBuf bytes.Buffer
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		_, _ = io.Copy(&stdoutBuf, stdoutReader)
	}()
	go func() {
		defer wg.Done()
		_, _ = io.Copy(&stderrBuf, stderrReader)
	}()

	runErr := fn()

	stdoutWriter.Close()
	stderrWriter.Close()
	wg.Wait()
	stdoutReader.Close()
	stderrReader.Close()

	os.Stdout = originalStdout
	os.Stderr = originalStderr

	result.Stdout = stdoutBuf.String()
	result.Stderr = stderrBuf.String()
	result.DurationMs = time.Since(startTime).Milliseconds()
	return result, runErr
}

func (e *localExecutor) withProjectEnvironment(
	projectRoot string,
	projectRef string,
	networkID string,
	fn func(afero.Fs) error,
) error {
	originalWD, err := os.Getwd()
	if err != nil {
		return err
	}
	defer func() {
		_ = os.Chdir(originalWD)
	}()

	if err := os.Chdir(projectRoot); err != nil {
		return err
	}

	resetSupabaseGlobals()
	flags.ProjectRef = projectRef
	if projectRef != "" {
		viper.Set("PROJECT_ID", projectRef)
		utils.Config.ProjectId = projectRef
	}
	if networkID != "" {
		viper.Set("network-id", networkID)
	}
	utils.UpdateDockerIds()

	_ = os.Setenv("SUPABASE_TELEMETRY_DISABLED", "true")
	_ = os.Setenv("SUPABASE_INTERNAL_TELEMETRY_DISABLED", "true")

	fsys := afero.NewOsFs()
	return fn(fsys)
}

func resetSupabaseGlobals() {
	viper.Reset()
	hostname := os.Getenv("RUNTIME_AGENT_SUPABASE_HOST")
	if hostname == "" {
		hostname = utils.GetHostname()
	}
	utils.Config = config.NewConfig(config.WithHostname(hostname))
	utils.OutputFormat.Value = utils.OutputPretty
	flags.ProjectRef = ""
}

var _ executor = (*localExecutor)(nil)
