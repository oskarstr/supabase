package server

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/rs/zerolog/log"
)

type cliExecutor struct {
	binary string
}

func newCLIExecutor(binary string) *cliExecutor {
	return &cliExecutor{
		binary: binary,
	}
}

func (e *cliExecutor) Provision(ctx context.Context, req provisionRequest) error {
	if err := e.stop(ctx, req.ProjectRoot); err != nil {
		log.Warn().
			Err(err).
			Str("project_ref", req.ProjectRef).
			Str("project_root", req.ProjectRoot).
			Msg("initial supabase stop failed, continuing with start")
	}

	args := []string{"start"}
	if req.IgnoreHealthCheck {
		args = append(args, "--ignore-health-check")
	}
	if req.NetworkID != "" {
		args = append(args, "--network-id", req.NetworkID)
	}
	for _, service := range req.ExcludedServices {
		service = strings.TrimSpace(service)
		if service == "" {
			continue
		}
		args = append(args, "--exclude", service)
	}

	if err := e.run(ctx, req.ProjectRoot, args, nil); err != nil {
		return fmt.Errorf("supabase start failed: %w", err)
	}

	return nil
}

func (e *cliExecutor) Stop(ctx context.Context, req stopRequest) error {
	return e.stopWithContext(ctx, req.ProjectRoot)
}

func (e *cliExecutor) Destroy(ctx context.Context, req destroyRequest) error {
	if err := e.stop(ctx, req.ProjectRoot); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			log.Warn().
				Err(err).
				Str("project_ref", req.ProjectRef).
				Str("project_root", req.ProjectRoot).
				Msg("supabase stop failed during destroy, continuing")
			return nil
		}
		return err
	}
	return nil
}

func (e *cliExecutor) stopWithContext(ctx context.Context, projectRoot string) error {
	if err := e.stop(ctx, projectRoot); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return fmt.Errorf("supabase stop failed: %w", err)
		}
		return err
	}
	return nil
}

func (e *cliExecutor) stop(ctx context.Context, projectRoot string) error {
	return e.run(ctx, projectRoot, []string{"stop", "--yes"}, map[string]string{
		"SUPABASE_TELEMETRY_DISABLED": "true",
	})
}

func (e *cliExecutor) run(
	ctx context.Context,
	projectRoot string,
	args []string,
	extraEnv map[string]string,
) error {
	cmd := exec.CommandContext(ctx, e.binary, args...)
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	env := os.Environ()
	env = append(env, "SUPABASE_TELEMETRY_DISABLED=true")
	for key, value := range extraEnv {
		env = append(env, fmt.Sprintf("%s=%s", key, value))
	}
	cmd.Env = env

	log.Info().
		Str("command", strings.Join(cmd.Args, " ")).
		Str("cwd", projectRoot).
		Msg("running supabase command")

	if err := cmd.Run(); err != nil {
		return err
	}
	return nil
}
