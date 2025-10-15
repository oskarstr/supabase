// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package delete

import (
	"context"
	"fmt"

	"github.com/go-errors/errors"
	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, projectRef string, fsys afero.Fs) error {
	// 1. Sanity checks.
	// 2. delete config
	{
		resp, err := utils.GetSupabase().V1DeleteHostnameConfigWithResponse(ctx, projectRef)
		if err != nil {
			return errors.Errorf("failed to delete custom hostname: %w", err)
		}
		if resp.StatusCode() != 200 {
			return errors.New("failed to delete custom hostname config; received: " + resp.Status())
		}
		fmt.Println("Deleted custom hostname config successfully.")
		return nil
	}
}
