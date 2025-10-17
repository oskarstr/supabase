package server

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"sync"
	"time"

	"github.com/spf13/afero"
	"github.com/spf13/viper"

	"github.com/rs/zerolog/log"
	"github.com/supabase/supabase/apps/runtime-agent/internal/start"
	"github.com/supabase/supabase/apps/runtime-agent/internal/stop"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils/flags"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/config"
)

type supabaseRunner interface {
	Start(ctx context.Context, fsys afero.Fs, excluded []string, ignoreHealth bool) error
	Stop(ctx context.Context, backup bool, projectRef string, all bool, fsys afero.Fs) error
}

type cliRunner struct{}

func (cliRunner) Start(ctx context.Context, fsys afero.Fs, excluded []string, ignoreHealth bool) error {
	return start.Run(ctx, fsys, excluded, ignoreHealth)
}

func (cliRunner) Stop(ctx context.Context, backup bool, projectRef string, all bool, fsys afero.Fs) error {
	return stop.Run(ctx, backup, projectRef, all, fsys)
}

type localExecutor struct {
	mu     sync.Mutex
	runner supabaseRunner
}

func newLocalExecutor() *localExecutor {
	return &localExecutor{runner: cliRunner{}}
}

func newLocalExecutorWithRunner(r supabaseRunner) *localExecutor {
	return &localExecutor{runner: r}
}

func (e *localExecutor) Provision(ctx context.Context, req provisionRequest) (operationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.runWithLogs(func() error {
		return e.withProjectEnvironment(req.ProjectRoot, req.ProjectRef, req.NetworkID, func(fsys afero.Fs) error {
			const backupVolumes = false
			if err := e.runner.Stop(ctx, backupVolumes, req.ProjectRef, false, fsys); err != nil && !isNotRunningError(err) {
				return err
			}

			excluded := append([]string(nil), req.ExcludedServices...)
			return e.runner.Start(ctx, fsys, excluded, req.IgnoreHealthCheck)
		})
	})
}

func (e *localExecutor) Stop(ctx context.Context, req stopRequest) (operationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.runWithLogs(func() error {
		return e.withProjectEnvironment(req.ProjectRoot, req.ProjectRef, "", func(fsys afero.Fs) error {
			const backupVolumes = false
			return e.runner.Stop(ctx, backupVolumes, req.ProjectRef, false, fsys)
		})
	})
}

func (e *localExecutor) Destroy(ctx context.Context, req destroyRequest) (operationResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	return e.runWithLogs(func() error {
		return e.withProjectEnvironment(req.ProjectRoot, req.ProjectRef, "", func(fsys afero.Fs) error {
			const backupVolumes = false
			return e.runner.Stop(ctx, backupVolumes, req.ProjectRef, false, fsys)
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
	defer func() {
		os.Stdout = originalStdout
		os.Stderr = originalStderr
	}()

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

	var runErr error
	var panicValue any
	func() {
		defer func() {
			if r := recover(); r != nil {
				panicValue = r
			}
		}()
		runErr = fn()
	}()

	stdoutWriter.Close()
	stderrWriter.Close()
	wg.Wait()
	stdoutReader.Close()
	stderrReader.Close()

	result.Stdout = stdoutBuf.String()
	result.Stderr = stderrBuf.String()
	result.DurationMs = time.Since(startTime).Milliseconds()
	if panicValue != nil {
		panic(panicValue)
	}
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

func isNotRunningError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, utils.ErrNotRunning) {
		return true
	}
	return err.Error() == utils.ErrNotRunning.Error()
}

func resetSupabaseGlobals() {
	viper.Reset()
	hostname := os.Getenv("RUNTIME_AGENT_SUPABASE_HOST")
	if hostname == "" {
		hostname = utils.GetHostname()
	}
	log.Info().Str("hostname", hostname).Msg("runtime-agent configuring supabase hostname")
	utils.Config = config.NewConfig(config.WithHostname(hostname))
	utils.OutputFormat.Value = utils.OutputPretty
	flags.ProjectRef = ""
}

var _ executor = (*localExecutor)(nil)
