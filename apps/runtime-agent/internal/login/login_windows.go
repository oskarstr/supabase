//go:build windows

// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package login

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
)

func RunOpenCmd(ctx context.Context, input string) error {
	cmd := exec.CommandContext(ctx, filepath.Join(os.Getenv("SYSTEMROOT"), "System32", "rundll32.exe"), "url.dll,FileProtocolHandler", input)
	return cmd.Run()
}
