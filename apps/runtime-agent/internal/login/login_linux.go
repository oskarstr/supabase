//go:build linux

// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package login

import (
	"bytes"
	"context"
	"os"
	"os/exec"
)

func RunOpenCmd(ctx context.Context, input string) error {
	if f, err := os.ReadFile("/proc/sys/kernel/osrelease"); err == nil && bytes.Contains(f, []byte("WSL")) {
		return exec.CommandContext(ctx, "wslview", input).Run()
	}
	return exec.CommandContext(ctx, "xdg-open", input).Run()
}
