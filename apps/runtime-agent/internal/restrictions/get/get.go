// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package get

import (
	"context"
	"fmt"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, projectRef string) error {
	resp, err := utils.GetSupabase().V1GetNetworkRestrictionsWithResponse(ctx, projectRef)
	if err != nil {
		return errors.Errorf("failed to retrieve network restrictions: %w", err)
	}
	if resp.JSON200 == nil {
		return errors.New("failed to retrieve network restrictions; received: " + string(resp.Body))
	}

	fmt.Printf("DB Allowed IPv4 CIDRs: %+v\n", resp.JSON200.Config.DbAllowedCidrs)
	fmt.Printf("DB Allowed IPv6 CIDRs: %+v\n", resp.JSON200.Config.DbAllowedCidrsV6)
	fmt.Printf("Restrictions applied successfully: %+v\n", resp.JSON200.Status == "applied")
	return nil
}
