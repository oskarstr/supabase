// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package reverify

import (
	"context"
	"fmt"

	"github.com/go-errors/errors"
	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/hostnames"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, projectRef string, includeRawOutput bool, fsys afero.Fs) error {
	// 1. Sanity checks.
	// 2. attempt to re-verify custom hostname config
	{
		resp, err := utils.GetSupabase().V1VerifyDnsConfigWithResponse(ctx, projectRef)
		if err != nil {
			return errors.Errorf("failed to re-verify custom hostname: %w", err)
		}
		if resp.JSON201 == nil {
			return errors.New("failed to re-verify custom hostname config: " + string(resp.Body))
		}
		status, err := hostnames.TranslateStatus(resp.JSON201, includeRawOutput)
		if err != nil {
			return err
		}
		fmt.Println(status)
		return nil
	}
}
