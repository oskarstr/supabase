//go:build darwin

// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package login

import (
	"context"
	"os/exec"
)

func RunOpenCmd(ctx context.Context, input string) error {
	cmd := exec.CommandContext(ctx, "open", input)
	return cmd.Run()
}
