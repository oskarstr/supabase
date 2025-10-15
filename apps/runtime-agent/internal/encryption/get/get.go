// Source: github.com/supabase/cli (commit 8b64f154fa7130f68f9194859b4459d4c0608b2b)

package get

import (
	"context"
	"fmt"

	"github.com/go-errors/errors"
	"github.com/supabase/supabase/apps/runtime-agent/internal/utils"
)

func Run(ctx context.Context, projectRef string) error {
	resp, err := utils.GetSupabase().V1GetPgsodiumConfigWithResponse(ctx, projectRef)
	if err != nil {
		return errors.Errorf("failed to retrieve pgsodium config: %w", err)
	}

	if resp.JSON200 == nil {
		return errors.New("Unexpected error retrieving project root key: " + string(resp.Body))
	}

	fmt.Println(resp.JSON200.RootKey)
	return nil
}
