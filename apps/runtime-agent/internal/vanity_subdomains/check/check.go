// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package check

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-errors/errors"
	"github.com/spf13/afero"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
	"github.com/supabase/supabase/apps/runtime-agent/pkg/api"
)

func Run(ctx context.Context, projectRef string, desiredSubdomain string, fsys afero.Fs) error {
	// 1. Sanity checks.
	subdomain := strings.TrimSpace(desiredSubdomain)
	{
		if len(subdomain) == 0 {
			return errors.New("non-empty vanity subdomain expected")
		}
	}

	// 2. check if the subdomain is available
	{
		resp, err := utils.GetSupabase().V1CheckVanitySubdomainAvailabilityWithResponse(ctx, projectRef, api.V1CheckVanitySubdomainAvailabilityJSONRequestBody{
			VanitySubdomain: subdomain,
		})
		if err != nil {
			return errors.Errorf("failed to check vanity subdomain: %w", err)
		}
		if resp.JSON201 == nil {
			return errors.New("failed to check subdomain availability: " + string(resp.Body))
		}
		fmt.Printf("Subdomain %s available: %+v\n", subdomain, resp.JSON201.Available)
		return nil
	}
}
